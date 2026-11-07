const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole, wrap, canManageCourse } = require('../middleware/auth');

router.use(authenticate);

// ---------- Announcements ----------
router.get(
  '/announcements',
  wrap(async (req, res) => {
    const { role, id } = req.user;
    let where = '';
    if (role === 'student')
      where = `WHERE a.course_id IS NULL OR a.course_id IN (SELECT course_id FROM enrollments WHERE student_id = $1)`;
    if (role === 'instructor')
      where = `WHERE a.course_id IS NULL OR a.author_id = $1 OR a.course_id IN (SELECT id FROM courses WHERE instructor_id = $1)`;
    const { rows } = await db.query(
      `SELECT a.*, u.name AS author_name, u.role AS author_role, c.title AS course_title
       FROM announcements a
       JOIN users u ON u.id = a.author_id
       LEFT JOIN courses c ON c.id = a.course_id
       ${where} ORDER BY a.created_at DESC LIMIT 100`,
      role === 'admin' ? [] : [id]
    );
    res.json({ announcements: rows });
  })
);

router.post(
  '/announcements',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const { title, body, course_id } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    let courseId = course_id ? Number(course_id) : null;
    if (courseId) {
      if (!(await canManageCourse(req.user, courseId))) return res.status(403).json({ error: 'Not your course' });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Choose a course for your announcement' });
    }

    const { rows } = await db.query(
      `INSERT INTO announcements (course_id, author_id, title, body) VALUES ($1,$2,$3,$4) RETURNING *`,
      [courseId, req.user.id, title.trim(), body || '']
    );
    res.status(201).json({ announcement: rows[0] });
  })
);

router.delete(
  '/announcements/:id',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const a = await db.query('SELECT author_id FROM announcements WHERE id = $1', [req.params.id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && a.rows[0].author_id !== req.user.id)
      return res.status(403).json({ error: 'You can only delete your own announcements' });
    await db.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  })
);

// ---------- Dashboard (role based) ----------
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const uid = req.user.id;

    if (req.user.role === 'student') {
      const [enr, courses, deadlines, quiz, grades, pending] = await Promise.all([
        db.query('SELECT COUNT(*)::int AS n FROM enrollments WHERE student_id = $1', [uid]),
        db.query(
          `SELECT c.id, c.title, c.color, c.category, u.name AS instructor_name,
             (SELECT COUNT(*) FROM lessons WHERE course_id = c.id)::int AS lessons_count,
             COALESCE((SELECT ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM lessons WHERE course_id = c.id),0))
                FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
                WHERE l.course_id = c.id AND lp.student_id = $1),0)::int AS progress
           FROM enrollments e JOIN courses c ON c.id = e.course_id JOIN users u ON u.id = c.instructor_id
           WHERE e.student_id = $1 ORDER BY e.enrolled_at DESC`,
          [uid]
        ),
        db.query(
          `SELECT a.id, a.title, a.due_date, c.title AS course_title, c.id AS course_id
           FROM assignments a JOIN courses c ON c.id = a.course_id
           JOIN enrollments e ON e.course_id = c.id AND e.student_id = $1
           WHERE NOT EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = $1)
           ORDER BY a.due_date NULLS LAST LIMIT 5`,
          [uid]
        ),
        db.query(
          `SELECT COALESCE(ROUND(AVG(100.0 * score / NULLIF(total,0))),0)::int AS avg, COUNT(*)::int AS attempts
           FROM quiz_attempts WHERE student_id = $1`,
          [uid]
        ),
        db.query(
          `SELECT COALESCE(ROUND(AVG(100.0 * s.grade / NULLIF(a.max_points,0))),0)::int AS avg
           FROM submissions s JOIN assignments a ON a.id = s.assignment_id
           WHERE s.student_id = $1 AND s.grade IS NOT NULL`,
          [uid]
        ),
        db.query(
          `SELECT COUNT(*)::int AS n FROM assignments a
           JOIN enrollments e ON e.course_id = a.course_id AND e.student_id = $1
           WHERE NOT EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = $1)`,
          [uid]
        ),
      ]);
      const list = courses.rows;
      return res.json({
        role: 'student',
        stats: {
          enrolled: enr.rows[0].n,
          completed: list.filter((c) => c.progress === 100 && c.lessons_count > 0).length,
          pendingAssignments: pending.rows[0].n,
          avgQuiz: quiz.rows[0].avg,
          avgGrade: grades.rows[0].avg,
        },
        courses: list,
        deadlines: deadlines.rows,
      });
    }

    if (req.user.role === 'instructor') {
      const [courses, students, queue, avgQuiz] = await Promise.all([
        db.query(
          `SELECT c.id, c.title, c.color, c.status, c.category,
             (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id)::int AS students,
             (SELECT COUNT(*) FROM lessons WHERE course_id = c.id)::int AS lessons_count
           FROM courses c WHERE c.instructor_id = $1 ORDER BY c.created_at DESC`,
          [uid]
        ),
        db.query(
          `SELECT COUNT(DISTINCT e.student_id)::int AS n FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.instructor_id = $1`,
          [uid]
        ),
        db.query(
          `SELECT s.id, s.submitted_at, a.title AS assignment_title, c.title AS course_title, u.name AS student_name
           FROM submissions s JOIN assignments a ON a.id = s.assignment_id JOIN courses c ON c.id = a.course_id
           JOIN users u ON u.id = s.student_id
           WHERE c.instructor_id = $1 AND s.grade IS NULL ORDER BY s.submitted_at LIMIT 6`,
          [uid]
        ),
        db.query(
          `SELECT COALESCE(ROUND(AVG(100.0 * qa.score / NULLIF(qa.total,0))),0)::int AS avg
           FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id JOIN courses c ON c.id = q.course_id
           WHERE c.instructor_id = $1`,
          [uid]
        ),
      ]);
      const pendingCount = await db.query(
        `SELECT COUNT(*)::int AS n FROM submissions s JOIN assignments a ON a.id = s.assignment_id
         JOIN courses c ON c.id = a.course_id WHERE c.instructor_id = $1 AND s.grade IS NULL`,
        [uid]
      );
      return res.json({
        role: 'instructor',
        stats: {
          courses: courses.rows.length,
          students: students.rows[0].n,
          toGrade: pendingCount.rows[0].n,
          avgQuiz: avgQuiz.rows[0].avg,
        },
        courses: courses.rows,
        queue: queue.rows,
      });
    }

    // admin
    const [counts, byCategory, topCourses, recentUsers, signups] = await Promise.all([
      db.query(
        `SELECT
          (SELECT COUNT(*) FROM users)::int AS users,
          (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS students,
          (SELECT COUNT(*) FROM users WHERE role = 'instructor')::int AS instructors,
          (SELECT COUNT(*) FROM courses)::int AS courses,
          (SELECT COUNT(*) FROM enrollments)::int AS enrollments`
      ),
      db.query(
        `SELECT c.category, COUNT(e.id)::int AS enrollments FROM courses c
         LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY c.category ORDER BY enrollments DESC`
      ),
      db.query(
        `SELECT c.id, c.title, c.color, u.name AS instructor_name, COUNT(e.id)::int AS students
         FROM courses c JOIN users u ON u.id = c.instructor_id LEFT JOIN enrollments e ON e.course_id = c.id
         GROUP BY c.id, u.name ORDER BY students DESC LIMIT 5`
      ),
      db.query(`SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 6`),
      db.query(
        `SELECT TO_CHAR(d, 'Mon DD') AS day, COALESCE(COUNT(u.id),0)::int AS n
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
         LEFT JOIN users u ON u.created_at::date = d::date GROUP BY d ORDER BY d`
      ),
    ]);
    res.json({
      role: 'admin',
      stats: counts.rows[0],
      byCategory: byCategory.rows,
      topCourses: topCourses.rows,
      recentUsers: recentUsers.rows,
      signups: signups.rows,
    });
  })
);

// ---------- Admin: user management ----------
router.get(
  '/admin/users',
  requireRole('admin'),
  wrap(async (req, res) => {
    const { q, role } = req.query;
    const params = [];
    const where = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (role && role !== 'all') {
      params.push(role);
      where.push(`role = $${params.length}`);
    }
    const { rows } = await db.query(
      `SELECT id, name, email, role, created_at FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY created_at DESC`,
      params
    );
    res.json({ users: rows });
  })
);

router.put(
  '/admin/users/:id/role',
  requireRole('admin'),
  wrap(async (req, res) => {
    const { role } = req.body;
    if (!['admin', 'instructor', 'student'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: "You can't change your own role" });
    const { rows } = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, created_at`,
      [role, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  })
);

router.delete(
  '/admin/users/:id',
  requireRole('admin'),
  wrap(async (req, res) => {
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: "You can't delete your own account" });
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  })
);

module.exports = router;
