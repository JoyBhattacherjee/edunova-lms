const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole, wrap, canManageCourse, isEnrolled } = require('../middleware/auth');

router.use(authenticate);

router.get(
  '/courses/:id/quizzes',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const manage = await canManageCourse(req.user, id);
    if (!manage && !(await isEnrolled(req.user.id, id))) return res.json({ quizzes: [] });

    const { rows } = await db.query(
      `SELECT q.*,
         (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id)::int AS question_count,
         (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id)::int AS attempt_count,
         (SELECT MAX(ROUND(100.0 * qa.score / NULLIF(qa.total,0))) FROM quiz_attempts qa
            WHERE qa.quiz_id = q.id AND qa.student_id = $2)::int AS best_percent
       FROM quizzes q WHERE q.course_id = $1 ORDER BY q.id`,
      [id, req.user.id]
    );
    res.json({ quizzes: rows });
  })
);

router.post(
  '/courses/:id/quizzes',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await canManageCourse(req.user, id))) return res.status(403).json({ error: 'Not your course' });

    const { title, description, time_limit_min, questions } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Quiz title is required' });
    if (!Array.isArray(questions) || !questions.length)
      return res.status(400).json({ error: 'Add at least one question' });

    for (const [i, q] of questions.entries()) {
      const opts = (q.options || []).map((o) => String(o).trim()).filter(Boolean);
      if (!q.question || !q.question.trim()) return res.status(400).json({ error: `Question ${i + 1} is empty` });
      if (opts.length < 2) return res.status(400).json({ error: `Question ${i + 1} needs at least 2 options` });
      if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index >= (q.options || []).length)
        return res.status(400).json({ error: `Choose the correct answer for question ${i + 1}` });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const quiz = await client.query(
        `INSERT INTO quizzes (course_id, title, description, time_limit_min) VALUES ($1,$2,$3,$4) RETURNING *`,
        [id, title.trim(), description || '', Number(time_limit_min) || 10]
      );
      for (const [i, q] of questions.entries()) {
        await client.query(
          `INSERT INTO quiz_questions (quiz_id, question, options, correct_index, position) VALUES ($1,$2,$3,$4,$5)`,
          [quiz.rows[0].id, q.question.trim(), JSON.stringify(q.options.map((o) => String(o))), q.correct_index, i + 1]
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ quiz: quiz.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  })
);

router.get(
  '/quizzes/:id',
  wrap(async (req, res) => {
    const qz = await db.query('SELECT * FROM quizzes WHERE id = $1', [req.params.id]);
    const quiz = qz.rows[0];
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const manage = await canManageCourse(req.user, quiz.course_id);
    if (!manage && !(await isEnrolled(req.user.id, quiz.course_id)))
      return res.status(403).json({ error: 'Enroll in this course first' });

    const { rows } = await db.query(
      `SELECT id, question, options, position ${manage ? ', correct_index' : ''}
       FROM quiz_questions WHERE quiz_id = $1 ORDER BY position`,
      [quiz.id]
    );
    res.json({ quiz, questions: rows });
  })
);

// Server-side grading so answers can't be tampered with
router.post(
  '/quizzes/:id/attempt',
  requireRole('student'),
  wrap(async (req, res) => {
    const qz = await db.query('SELECT * FROM quizzes WHERE id = $1', [req.params.id]);
    const quiz = qz.rows[0];
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (!(await isEnrolled(req.user.id, quiz.course_id)))
      return res.status(403).json({ error: 'Enroll in this course first' });

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const { rows: questions } = await db.query(
      'SELECT id, question, options, correct_index FROM quiz_questions WHERE quiz_id = $1 ORDER BY position',
      [quiz.id]
    );

    let score = 0;
    const review = questions.map((q, i) => {
      const chosen = Number.isInteger(answers[i]) ? answers[i] : null;
      const correct = chosen === q.correct_index;
      if (correct) score++;
      return { question: q.question, options: q.options, chosen, correct_index: q.correct_index, correct };
    });

    const { rows } = await db.query(
      `INSERT INTO quiz_attempts (quiz_id, student_id, score, total, answers) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [quiz.id, req.user.id, score, questions.length, JSON.stringify(answers)]
    );
    res.status(201).json({ attempt: rows[0], score, total: questions.length, review });
  })
);

router.get(
  '/quizzes/:id/attempts',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const qz = await db.query('SELECT course_id FROM quizzes WHERE id = $1', [req.params.id]);
    if (!qz.rows[0]) return res.status(404).json({ error: 'Quiz not found' });
    if (!(await canManageCourse(req.user, qz.rows[0].course_id))) return res.status(403).json({ error: 'Not your course' });
    const { rows } = await db.query(
      `SELECT qa.id, qa.score, qa.total, qa.taken_at, u.name AS student_name
       FROM quiz_attempts qa JOIN users u ON u.id = qa.student_id
       WHERE qa.quiz_id = $1 ORDER BY qa.taken_at DESC`,
      [req.params.id]
    );
    res.json({ attempts: rows });
  })
);

router.delete(
  '/quizzes/:id',
  requireRole('instructor', 'admin'),
  wrap(async (req, res) => {
    const qz = await db.query('SELECT course_id FROM quizzes WHERE id = $1', [req.params.id]);
    if (!qz.rows[0]) return res.status(404).json({ error: 'Quiz not found' });
    if (!(await canManageCourse(req.user, qz.rows[0].course_id))) return res.status(403).json({ error: 'Not your course' });
    await db.query('DELETE FROM quizzes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  })
);

module.exports = router;
