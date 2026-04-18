# Skill: Auth & Sessions

Use this skill for all authentication, session management, and password handling.

---

## Session cookie strategy

Sessions are stored in the `sessions` DB table. The browser holds an HTTP-only cookie containing the session token. There are no JWTs.

```js
// backend/src/services/auth.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const BCRYPT_ROUNDS = 12;
const SESSION_TTL_DAYS = 30;

async function register({ email, username, password }) {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { rows } = await db.query(
    `INSERT INTO users (email, username, password_hash)
     VALUES ($1, $2, $3) RETURNING id, email, username, created_at`,
    [email.toLowerCase(), username, hash]
  );
  return rows[0];
}

async function login({ email, password, ip, userAgent }) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1', [email.toLowerCase()]
  );
  const user = rows[0];
  if (!user) throw new Error('Invalid credentials');
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Invalid credentials');
  return createSession(user.id, ip, userAgent);
}

async function createSession(userId, ip, userAgent) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000);
  await db.query(
    `INSERT INTO sessions (user_id, token, ip, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, token, ip, userAgent, expiresAt]
  );
  return token;
}

async function validateSession(token) {
  if (!token) return null;
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.username
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  return rows[0] || null;
}

async function logout(token) {
  await db.query('DELETE FROM sessions WHERE token = $1', [token]);
}

async function listSessions(userId) {
  const { rows } = await db.query(
    `SELECT id, ip, user_agent, created_at, expires_at
     FROM sessions WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function deleteSession(sessionId, userId) {
  await db.query(
    'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );
}

async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) throw new Error('Current password is incorrect');
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, userId]);
}

module.exports = { register, login, validateSession, logout, listSessions, deleteSession, changePassword, createSession };
```

---

## Auth middleware

```js
// backend/src/middleware/auth.js
const { validateSession } = require('../services/auth');

module.exports = async function authMiddleware(req, res, next) {
  const token = req.cookies?.session_token;
  const user = await validateSession(token);
  if (!user) return res.status(401).json({ data: null, error: 'Unauthorized' });
  req.user = user;
  req.sessionToken = token;
  next();
};
```

---

## Route handlers

```js
// backend/src/routes/auth.js
const router = require('express').Router();
const auth = require('../services/auth');
const authMiddleware = require('../middleware/auth');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password)
      return res.status(400).json({ data: null, error: 'All fields required' });
    const user = await auth.register({ email, username, password });
    const token = await auth.createSession(user.id, req.ip, req.headers['user-agent']);
    res.cookie('session_token', token, COOKIE_OPTS);
    res.json({ data: user, error: null });
  } catch (err) {
    const status = err.message.includes('unique') ? 400 : 500;
    res.status(status).json({ data: null, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = await auth.login({ email, password, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.cookie('session_token', token, COOKIE_OPTS);
    res.json({ data: { token }, error: null });
  } catch (err) {
    res.status(401).json({ data: null, error: err.message });
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  await auth.logout(req.sessionToken);
  res.clearCookie('session_token');
  res.json({ data: null, error: null });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ data: req.user, error: null });
});

router.get('/sessions', authMiddleware, async (req, res) => {
  const sessions = await auth.listSessions(req.user.id);
  res.json({ data: sessions, error: null });
});

router.delete('/sessions/:id', authMiddleware, async (req, res) => {
  await auth.deleteSession(req.params.id, req.user.id);
  res.json({ data: null, error: null });
});

router.post('/password/change', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await auth.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ data: null, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: err.message });
  }
});

module.exports = router;
```

---

## Entry point wiring

```js
// in backend/src/index.js
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use('/api/v1/auth', require('./routes/auth'));
```

---

## Key rules

- Never return `password_hash` in any API response — always SELECT only safe columns
- Always use `email.toLowerCase()` before storing or querying
- Duplicate email/username violations produce a Postgres unique constraint error — catch and return 400
- The `sessions` table is the single source of truth; no in-memory session store
- WS authentication: client sends `{ type: 'auth', payload: { token } }` immediately on connect; server calls `validateSession(token)` and closes with code 4001 if invalid
