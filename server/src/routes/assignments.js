const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole, wrap, canManageCourse, isEnrolled } = require('../middleware/auth');

router.use(authenticate);

// All assignments across the student's enrolled courses
router.get(
  '/assignments/mine',
  requireRole('student'),
  wrap(async (req, res) => {
    const { rows } = await db.query(
      `SELECT a.*, c.title AS course_title, c.color AS course_color,
              s.id AS submission_id, s.submitted_at, s.grade, s.feedback, s.content AS submission_content
       FROM assignments a
       JOIN courses c ON c.id = a.course_id
       JOIN enrollments e ON e.course_id = c.id AND e.student_id = $1
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
       ORDER BY (s.id IS NOT NULL), a.due_date NULLS LAST`,
      [req.user.id]
    );
    res.json({ assignments: rows });
  })
);

// Assignments needing attention for an instructor (all their courses)
router.get(
  '/assignments/grading-queue',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const { rows } = await db.query(
      `SELECT s.id, s.submitted_at, s.content, a.id AS assignment_id, a.title AS assignment_title, a.max_points,
              c.title AS course_title, u.name AS student_name
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN courses c ON c.id = a.course_id
       JOIN users u ON u.id = s.student_id
       WHERE s.grade IS NULL AND ($1 = 'admin' OR c.instructor_id = $2)
       ORDER BY s.submitted_at`,
      [req.user.role, req.user.id]
    );
    res.json({ submissions: rows });
  })
);

router.get(
  '/courses/:id/assignments',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const manage = await canManageCourse(req.user, id);

    if (manage) {
      const { rows } = await db.query(
        `SELECT a.*,
           (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id)::int AS submission_count,
           (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.grade IS NULL)::int AS ungraded_count
         FROM assignments a WHERE a.course_id = $1 ORDER BY a.due_date NULLS LAST, a.id`,
        [id]
      );
      return res.json({ assignments: rows });
    }
    if (!(await isEnrolled(req.user.id, id))) return res.json({ assignments: [] });

    const { rows } = await db.query(
      `SELECT a.*, s.id AS submission_id, s.submitted_at, s.grade, s.feedback, s.content AS submission_content
       FROM assignments a
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $2
       WHERE a.course_id = $1 ORDER BY a.due_date NULLS LAST, a.id`,
      [id, req.user.id]
    );
    res.json({ assignments: rows });
  })
);

router.post(
  '/courses/:id/assignments',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await canManageCourse(req.user, id))) return res.status(403).json({ error: 'Not your course' });
    const { title, description, due_date, max_points } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Assignment title is required' });

    const { rows } = await db.query(
      `INSERT INTO assignments (course_id, title, description, due_date, max_points)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, title.trim(), description || '', due_date || null, Number(max_points) || 100]
    );
    res.status(201).json({ assignment: rows[0] });
  })
);

router.delete(
  '/assignments/:id',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const a = await db.query('SELECT course_id FROM assignments WHERE id = $1', [req.params.id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'Assignment not found' });
    if (!(await canManageCourse(req.user, a.rows[0].course_id))) return res.status(403).json({ error: 'Not your course' });
    await db.query('DELETE FROM assignments WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  })
);

// Student submits (or re-submits before it is graded)
router.post(
  '/assignments/:id/submit',
  requireRole('student'),
  wrap(async (req, res) => {
    const a = await db.query('SELECT * FROM assignments WHERE id = $1', [req.params.id]);
    const assignment = a.rows[0];
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    if (!(await isEnrolled(req.user.id, assignment.course_id)))
      return res.status(403).json({ error: 'Enroll in this course first' });

    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Your submission cannot be empty' });

    const prev = await db.query('SELECT grade FROM submissions WHERE assignment_id = $1 AND student_id = $2', [
      assignment.id,
      req.user.id,
    ]);
    if (prev.rows[0] && prev.rows[0].grade !== null)
      return res.status(400).json({ error: 'This submission has already been graded' });

    const { rows } = await db.query(
      `INSERT INTO submissions (assignment_id, student_id, content) VALUES ($1,$2,$3)
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET content = EXCLUDED.content, submitted_at = NOW()
       RETURNING *`,
      [assignment.id, req.user.id, content]
    );
    res.status(201).json({ submission: rows[0] });
  })
);

router.get(
  '/assignments/:id/submissions',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const a = await db.query('SELECT * FROM assignments WHERE id = $1', [req.params.id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'Assignment not found' });
    if (!(await canManageCourse(req.user, a.rows[0].course_id))) return res.status(403).json({ error: 'Not your course' });

    const { rows } = await db.query(
      `SELECT s.*, u.name AS student_name, u.email AS student_email
       FROM submissions s JOIN users u ON u.id = s.student_id
       WHERE s.assignment_id = $1 ORDER BY (s.grade IS NOT NULL), s.submitted_at`,
      [req.params.id]
    );
    res.json({ assignment: a.rows[0], submissions: rows });
  })
);

router.put(
  '/submissions/:id/grade',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const s = await db.query(
      `SELECT s.id, a.course_id, a.max_points FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.id = $1`,
      [req.params.id]
    );
    if (!s.rows[0]) return res.status(404).json({ error: 'Submission not found' });
    if (!(await canManageCourse(req.user, s.rows[0].course_id))) return res.status(403).json({ error: 'Not your course' });

    const grade = Number(req.body.grade);
    if (!Number.isFinite(grade) || grade < 0 || grade > s.rows[0].max_points)
      return res.status(400).json({ error: `Grade must be between 0 and ${s.rows[0].max_points}` });

    const { rows } = await db.query(
      `UPDATE submissions SET grade = $1, feedback = $2, graded_at = NOW() WHERE id = $3 RETURNING *`,
      [Math.round(grade), req.body.feedback || '', req.params.id]
    );
    res.json({ submission: rows[0] });
  })
);

module.exports = router;
