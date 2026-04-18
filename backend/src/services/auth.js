import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { unlink } from 'fs/promises';
import * as userQueries from '../db/queries/users.js';
import * as sessionQueries from '../db/queries/sessions.js';
import * as passwordResetQueries from '../db/queries/password_reset.js';
import pool from '../db/index.js';

const BCRYPT_COST = 12;

export async function register(email, username, password) {
  email = email.toLowerCase();

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    throw new Error('Username must be 3-30 characters and contain only alphanumeric characters and underscores');
  }

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
  email = email.toLowerCase();

  const user = await userQueries.findUserByEmail(email);
  if (!user) throw new Error('Invalid credentials');

  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) throw new Error('Invalid credentials');

  const token = crypto.randomBytes(32).toString('hex');
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

    // Get all attachments in rooms owned by this user before deleting messages
    const attachmentsResult = await client.query(
      `SELECT a.filename FROM attachments a
       JOIN messages m ON a.message_id = m.id
       WHERE m.room_id IN (SELECT id FROM rooms WHERE owner_id = $1)`,
      [userId]
    );

    // Delete from database first (with cascade)
    await client.query('DELETE FROM room_members WHERE room_id IN (SELECT id FROM rooms WHERE owner_id = $1)', [userId]);
    await client.query('DELETE FROM room_bans WHERE room_id IN (SELECT id FROM rooms WHERE owner_id = $1)', [userId]);
    await client.query('DELETE FROM messages WHERE room_id IN (SELECT id FROM rooms WHERE owner_id = $1)', [userId]);
    await client.query('DELETE FROM rooms WHERE owner_id = $1', [userId]);

    // Remove user from other rooms
    await client.query('DELETE FROM room_members WHERE user_id = $1', [userId]);

    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM friendships WHERE requester_id = $1 OR addressee_id = $1', [userId]);
    await client.query('DELETE FROM user_bans WHERE banner_id = $1 OR banned_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    // Delete files from disk after successful commit
    for (const row of attachmentsResult.rows) {
      try {
        await unlink(`/app/uploads/${row.filename}`);
      } catch (err) {
        console.error(`Error deleting file ${row.filename}:`, err);
        // Continue even if file deletion fails
      }
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function logoutAll(userId) {
  await sessionQueries.deleteAllSessionsByUserId(userId);
}

export async function requestPasswordReset(email) {
  email = email.toLowerCase();
  const user = await userQueries.findUserByEmail(email);
  if (!user) throw new Error('User not found');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  const resetToken = await passwordResetQueries.createResetToken(user.id, token, expiresAt);
  return { token: resetToken.token };
}

export async function confirmPasswordReset(token, newPassword) {
  const resetToken = await passwordResetQueries.findResetToken(token);
  if (!resetToken) throw new Error('Invalid or expired reset token');

  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await userQueries.updateUserPassword(resetToken.user_id, passwordHash);
  await passwordResetQueries.markResetTokenUsed(resetToken.id);
}

export async function updateUser(userId, fields) {
  const user = await userQueries.findUserById(userId);
  if (!user) throw new Error('User not found');

  const updated = await userQueries.updateUser(userId, fields);
  if (!updated) throw new Error('No fields to update');

  return { id: updated.id, email: updated.email, username: updated.username };
}
