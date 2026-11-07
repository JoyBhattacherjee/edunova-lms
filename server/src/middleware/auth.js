const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'dev-only-secret';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Verifies the Bearer token and loads the current user onto req.user
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = jwt.verify(token, SECRET);
    const { rows } = await db.query(
      'SELECT id, name, email, role, bio, created_at FROM users WHERE id = $1',
      [payload.id]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Account no longer exists' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that' });
    }
    next();
  };
}

// Wrap async route handlers so errors reach the error middleware
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Can this user manage (edit/grade) the course? Admin: any. Instructor: own courses.
async function canManageCourse(user, courseId) {
  if (user.role === 'admin') return true;
  if (user.role !== 'instructor') return false;
  const { rows } = await db.query('SELECT 1 FROM courses WHERE id = $1 AND instructor_id = $2', [
    courseId,
    user.id,
  ]);
  return rows.length > 0;
}

async function isEnrolled(userId, courseId) {
  const { rows } = await db.query(
    'SELECT 1 FROM enrollments WHERE student_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  return rows.length > 0;
}

module.exports = { signToken, authenticate, requireRole, wrap, canManageCourse, isEnrolled };
