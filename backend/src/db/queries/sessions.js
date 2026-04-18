import pool from '../index.js';

export async function createSession(userId, token, ip, userAgent) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const result = await pool.query(
    'INSERT INTO sessions (user_id, token, ip, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, token, ip, userAgent, expiresAt]
  );
  return result.rows[0];
}

export async function findSessionByToken(token) {
  const result = await pool.query(
    'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  return result.rows[0];
}

export async function findSessionById(sessionId) {
  const result = await pool.query(
    'SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()',
    [sessionId]
  );
  return result.rows[0];
}

export async function listSessionsByUserId(userId) {
  const result = await pool.query(
    'SELECT * FROM sessions WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

export async function deleteSessionById(sessionId) {
  const result = await pool.query('DELETE FROM sessions WHERE id = $1 RETURNING *', [sessionId]);
  return result.rows[0];
}

export async function deleteSessionByToken(token) {
  const result = await pool.query(
    'DELETE FROM sessions WHERE token = $1 RETURNING *',
    [token]
  );
  return result.rows[0];
}

export async function deleteExpiredSessions() {
  await pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');
}

export async function updateSessionLastSeen(sessionId) {
  const result = await pool.query(
    'UPDATE sessions SET last_seen = NOW() WHERE id = $1 RETURNING *',
    [sessionId]
  );
  return result.rows[0];
}

export async function deleteAllSessionsByUserId(userId) {
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}
