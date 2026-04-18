import pool from '../index.js';

export async function createResetToken(userId, token, expiresAt) {
  const result = await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
    [userId, token, expiresAt]
  );
  return result.rows[0];
}

export async function findResetToken(token) {
  const result = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
    [token]
  );
  return result.rows[0];
}

export async function markResetTokenUsed(tokenId) {
  const result = await pool.query(
    'UPDATE password_reset_tokens SET used = true WHERE id = $1 RETURNING *',
    [tokenId]
  );
  return result.rows[0];
}
