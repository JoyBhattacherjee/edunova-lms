const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole, wrap, canManageCourse, isEnrolled } = require('../middleware/auth');

router.use(authenticate);

// Reusable SELECT with instructor name, counts, and per-user progress
const COURSE_SELECT = `
  SELECT c.*, u.name AS instructor_name,
    (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id)::int AS enrolled_count,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id)::int AS lessons_count,
    EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $1) AS is_enrolled,
    COALESCE((
      SELECT ROUND(100.0 * COUNT(lp.id) / NULLIF((SELECT COUNT(*) FROM lessons l2 WHERE l2.course_id = c.id), 0))
      FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
      WHERE l.course_id = c.id AND lp.student_id = $1
    ), 0)::int AS progress
  FROM courses c JOIN users u ON u.id = c.instructor_id
`;

// ---------- Catalog ----------
router.get(
  '/courses',
  wrap(async (req, res) => {
    const { q, category, level } = req.query;
    const params = [req.user.id];
    const where = [];

    if (req.user.role === 'student') where.push(`c.status = 'published'`);
    if (req.user.role === 'instructor') where.push(`(c.status = 'published' OR c.instructor_id = $1)`);
    if (q) {
      params.push(`%${q}%`);
      where.push(`(c.title ILIKE $${params.length} OR c.description ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
    }
    if (category && category !== 'All') {
      params.push(category);
      where.push(`c.category = $${params.length}`);
    }
    if (level && level !== 'All') {
      params.push(level);
      where.push(`c.level = $${params.length}`);
    }

    const sql = `${COURSE_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.created_at DESC`;
    const { rows } = await db.query(sql, params);
    res.json({ courses: rows });
  })
);

router.get(
  '/courses/categories',
  wrap(async (req, res) => {
    const { rows } = await db.query(`SELECT DISTINCT category FROM courses ORDER BY category`);
    res.json({ categories: rows.map((r) => r.category) });
  })
);

// Courses the user is learning (student) or teaching (instructor)
router.get(
  '/courses/mine',
  wrap(async (req, res) => {
    let sql;
    if (req.user.role === 'student') {
      sql = `${COURSE_SELECT} WHERE EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $1) ORDER BY c.title`;
    } else if (req.user.role === 'instructor') {
      sql = `${COURSE_SELECT} WHERE c.instructor_id = $1 ORDER BY c.created_at DESC`;
    } else {
      sql = `${COURSE_SELECT} ORDER BY c.created_at DESC`;
    }
    const { rows } = await db.query(sql, [req.user.id]);
    res.json({ courses: rows });
  })
);

// ---------- Single course ----------
router.get(
  '/courses/:id',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const { rows } = await db.query(`${COURSE_SELECT} WHERE c.id = $2`, [req.user.id, id]);
    const course = rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const manage = await canManageCourse(req.user, id);
    if (course.status === 'draft' && !manage) return res.status(404).json({ error: 'Course not found' });

    const lessonsRes = await db.query(
      `SELECT l.id, l.title, l.duration_min, l.position, l.content, l.video_url,
              (lp.id IS NOT NULL) AS completed
       FROM lessons l
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = $1
       WHERE l.course_id = $2 ORDER BY l.position, l.id`,
      [req.user.id, id]
    );

    // Lesson bodies are only visible to enrolled students and course managers
    const canView = manage || course.is_enrolled;
    const lessons = lessonsRes.rows.map((l) =>
      canView ? l : { ...l, content: null, video_url: null, locked: true }
    );

    res.json({ course: { ...course, can_manage: manage }, lessons });
  })
);

router.post(
  '/courses',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const { title, description, category, level, duration_hours, status, color } = req.body;
    if (!title || title.trim().length < 3) return res.status(400).json({ error: 'Course title is required' });

    const { rows } = await db.query(
      `INSERT INTO courses (title, description, category, level, duration_hours, status, color, instructor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        title.trim(),
        description || '',
        category || 'General',
        ['Beginner', 'Intermediate', 'Advanced'].includes(level) ? level : 'Beginner',
        Number(duration_hours) || 1,
        status === 'draft' ? 'draft' : 'published',
        color || '#2563eb',
        req.user.id,
      ]
    );
    res.status(201).json({ course: rows[0] });
  })
);

router.put(
  '/courses/:id',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await canManageCourse(req.user, id))) return res.status(403).json({ error: 'Not your course' });
    const { title, description, category, level, duration_hours, status, color } = req.body;
    const { rows } = await db.query(
      `UPDATE courses SET
         title = COALESCE($1, title), description = COALESCE($2, description),
         category = COALESCE($3, category),
         level = COALESCE($4, level), duration_hours = COALESCE($5, duration_hours),
         status = COALESCE($6, status), color = COALESCE($7, color)
       WHERE id = $8 RETURNING *`,
      [title, description, category, level, duration_hours, status, color, id]
    );
    res.json({ course: rows[0] });
  })
);

router.delete(
  '/courses/:id',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await canManageCourse(req.user, id))) return res.status(403).json({ error: 'Not your course' });
    await db.query('DELETE FROM courses WHERE id = $1', [id]);
    res.json({ ok: true });
  })
);

// ---------- Enrollment ----------
router.post(
  '/courses/:id/enroll',
  requireRole('student'),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const c = await db.query(`SELECT status FROM courses WHERE id = $1`, [id]);
    if (!c.rows[0] || c.rows[0].status !== 'published') return res.status(404).json({ error: 'Course not found' });
    await db.query(
      'INSERT INTO enrollments (course_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [id, req.user.id]
    );
    res.status(201).json({ ok: true });
  })
);

router.delete(
  '/courses/:id/enroll',
  requireRole('student'),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    await db.query('DELETE FROM enrollments WHERE course_id = $1 AND student_id = $2', [id, req.user.id]);
    await db.query(
      `DELETE FROM lesson_progress WHERE student_id = $1 AND lesson_id IN (SELECT id FROM lessons WHERE course_id = $2)`,
      [req.user.id, id]
    );
    res.json({ ok: true });
  })
);

// Roster with progress (instructor / admin)
router.get(
  '/courses/:id/students',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await canManageCourse(req.user, id))) return res.status(403).json({ error: 'Not allowed' });
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, e.enrolled_at,
        COALESCE(ROUND(100.0 * (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
                       WHERE l.course_id = $1 AND lp.student_id = u.id)
                / NULLIF((SELECT COUNT(*) FROM lessons WHERE course_id = $1), 0)), 0)::int AS progress
       FROM enrollments e JOIN users u ON u.id = e.student_id
       WHERE e.course_id = $1 ORDER BY u.name`,
      [id]
    );
    res.json({ students: rows });
  })
);

// ---------- Lessons ----------
router.post(
  '/courses/:id/lessons',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await canManageCourse(req.user, id))) return res.status(403).json({ error: 'Not your course' });
    const { title, content, video_url, duration_min } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Lesson title is required' });

    const pos = await db.query('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM lessons WHERE course_id = $1', [id]);
    const { rows } = await db.query(
      `INSERT INTO lessons (course_id, title, content, video_url, duration_min, position)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, title.trim(), content || '', video_url || '', Number(duration_min) || 10, pos.rows[0].next]
    );
    res.status(201).json({ lesson: rows[0] });
  })
);

router.put(
  '/lessons/:lessonId',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const l = await db.query('SELECT course_id FROM lessons WHERE id = $1', [req.params.lessonId]);
    if (!l.rows[0]) return res.status(404).json({ error: 'Lesson not found' });
    if (!(await canManageCourse(req.user, l.rows[0].course_id))) return res.status(403).json({ error: 'Not your course' });

    const { title, content, video_url, duration_min } = req.body;
    const { rows } = await db.query(
      `UPDATE lessons SET title = COALESCE($1,title), content = COALESCE($2,content),
         video_url = COALESCE($3,video_url), duration_min = COALESCE($4,duration_min)
       WHERE id = $5 RETURNING *`,
      [title, content, video_url, duration_min, req.params.lessonId]
    );
    res.json({ lesson: rows[0] });
  })
);

router.delete(
  '/lessons/:lessonId',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const l = await db.query('SELECT course_id FROM lessons WHERE id = $1', [req.params.lessonId]);
    if (!l.rows[0]) return res.status(404).json({ error: 'Lesson not found' });
    if (!(await canManageCourse(req.user, l.rows[0].course_id))) return res.status(403).json({ error: 'Not your course' });
    await db.query('DELETE FROM lessons WHERE id = $1', [req.params.lessonId]);
    res.json({ ok: true });
  })
);

// Toggle completion for the current student
router.post(
  '/lessons/:lessonId/complete',
  requireRole('student'),
  wrap(async (req, res) => {
    const l = await db.query('SELECT course_id FROM lessons WHERE id = $1', [req.params.lessonId]);
    if (!l.rows[0]) return res.status(404).json({ error: 'Lesson not found' });
    if (!(await isEnrolled(req.user.id, l.rows[0].course_id)))
      return res.status(403).json({ error: 'Enroll in this course first' });

    const existing = await db.query('SELECT id FROM lesson_progress WHERE lesson_id = $1 AND student_id = $2', [
      req.params.lessonId,
      req.user.id,
    ]);
    if (existing.rows.length) {
      await db.query('DELETE FROM lesson_progress WHERE id = $1', [existing.rows[0].id]);
      return res.json({ completed: false });
    }
    await db.query('INSERT INTO lesson_progress (lesson_id, student_id) VALUES ($1,$2)', [
      req.params.lessonId,
      req.user.id,
    ]);
    res.json({ completed: true });
  })
);

module.exports = router;
