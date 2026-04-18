import pool from '../index.js';

export async function createUser(email, username, passwordHash) {
  const result = await pool.query(
    'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [email.toLowerCase(), username, passwordHash]
  );
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return result.rows[0];
}

export async function findUserByUsername(username) {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0];
}

export async function findUserById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

export async function updateUserPassword(userId, passwordHash) {
  const result = await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [passwordHash, userId]
  );
  return result.rows[0];
}

export async function deleteUserById(userId) {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);
  return result.rows[0];
}

export async function updateUser(userId, fields) {
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (fields.email) {
    updates.push(`email = $${paramCount}`);
    values.push(fields.email.toLowerCase());
    paramCount++;
  }
  if (fields.username) {
    updates.push(`username = $${paramCount}`);
    values.push(fields.username);
    paramCount++;
  }

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
}
