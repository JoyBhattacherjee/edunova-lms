const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authenticate, wrap } = require('../middleware/auth');

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

router.post(
  '/auth/register',
  wrap(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Please enter your full name' });
    if (!emailOk(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Self-registration is limited to student / instructor. Admins are created via seed or by another admin.
    const safeRole = role === 'instructor' ? 'instructor' : 'student';

    const exists = await db.query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'An account with this email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, LOWER($2), $3, $4)
       RETURNING id, name, email, role, bio, created_at`,
      [name.trim(), email.trim(), hash, safeRole]
    );
    res.status(201).json({ token: signToken(rows[0]), user: rows[0] });
  })
);

router.post(
  '/auth/login',
  wrap(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const { rows } = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Incorrect email or password' });

    delete user.password_hash;
    res.json({ token: signToken(user), user });
  })
);

router.get('/auth/me', authenticate, (req, res) => res.json({ user: req.user }));

router.put(
  '/auth/profile',
  authenticate,
  wrap(async (req, res) => {
    const { name, bio, currentPassword, newPassword } = req.body;
    if (name !== undefined && name.trim().length < 2)
      return res.status(400).json({ error: 'Name is too short' });

    if (newPassword) {
      if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
      const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      if (!(await bcrypt.compare(currentPassword || '', rows[0].password_hash)))
        return res.status(400).json({ error: 'Current password is incorrect' });
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        await bcrypt.hash(newPassword, 10),
        req.user.id,
      ]);
    }

    const { rows } = await db.query(
      `UPDATE users SET name = COALESCE($1, name), bio = COALESCE($2, bio)
       WHERE id = $3 RETURNING id, name, email, role, bio, created_at`,
      [name ? name.trim() : null, bio ?? null, req.user.id]
    );
    res.json({ user: rows[0] });
  })
);

module.exports = router;
