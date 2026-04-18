import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as userQueries from '../db/queries/users.js';
import * as sessionQueries from '../db/queries/sessions.js';
import pool from '../db/index.js';

const BCRYPT_COST = 12;

export async function register(email, username, password) {
  const existingEmail = await userQueries.findUserByEmail(email);
  if (existingEmail) throw new Error('Email already in use');

  const existingUsername = await userQueries.findUserByUsername(username);
  if (existingUsername) throw new Error('Username already in use');

  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await userQueries.createUser(email, username, passwordHash);

  return { id: user.id, email: user.email, username: user.username };
}

export async function login(email, password, ip, userAgent) {
  const user = await userQueries.findUserByEmail(email);
  if (!user) throw new Error('Invalid email or password');

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) throw new Error('Invalid email or password');

  const token = uuidv4();
  const session = await sessionQueries.createSession(user.id, token, ip, userAgent);

  return {
    user: { id: user.id, email: user.email, username: user.username },
    session: { id: session.id, token: session.token },
  };
}

export async function logout(sessionId) {
  await sessionQueries.deleteSessionById(sessionId);
}

export async function getSessionUser(token) {
  const session = await sessionQueries.findSessionByToken(token);
  if (!session) return null;

  const user = await userQueries.findUserById(session.user_id);
  if (!user) return null;

  return { user, session };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await userQueries.findUserById(userId);
  if (!user) throw new Error('User not found');

  const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!passwordValid) throw new Error('Current password is incorrect');

  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await userQueries.updateUserPassword(userId, passwordHash);
}

export async function deleteAccount(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM room_members WHERE room_id IN (SELECT id FROM rooms WHERE owner_id = $1)', [userId]);
    await client.query('DELETE FROM room_bans WHERE room_id IN (SELECT id FROM rooms WHERE owner_id = $1)', [userId]);
    await client.query('DELETE FROM messages WHERE room_id IN (SELECT id FROM rooms WHERE owner_id = $1)', [userId]);
    await client.query('DELETE FROM rooms WHERE owner_id = $1', [userId]);

    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM friendships WHERE requester_id = $1 OR addressee_id = $1', [userId]);
    await client.query('DELETE FROM user_bans WHERE banner_id = $1 OR banned_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
