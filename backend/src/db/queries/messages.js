import pool from '../index.js';
import * as attachmentQueries from './attachments.js';

export async function createMessage(roomOrDialogId, userId, content, replyToId = null, isDialog = false) {
  const result = await pool.query(
    isDialog
      ? `INSERT INTO messages (dialog_id, user_id, content, reply_to_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`
      : `INSERT INTO messages (room_id, user_id, content, reply_to_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
    [roomOrDialogId, userId, content, replyToId]
  );
  return result.rows[0];
}

export async function findMessageById(messageId) {
  const result = await pool.query(
    `SELECT m.*, u.username, u.email
     FROM messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.id = $1`,
    [messageId]
  );
  return result.rows[0];
}

export async function getMessagesByRoom(roomId, beforeId = null, limit = 50) {
  let query = `SELECT m.*, u.username, u.email
               FROM messages m
               JOIN users u ON m.user_id = u.id
               WHERE m.room_id = $1 AND m.deleted = false`;
  const params = [roomId];

  if (beforeId) {
    query += ` AND m.id < $2`;
    params.push(beforeId);
  }

  query += ` ORDER BY m.id DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows.reverse();
}

export async function updateMessage(messageId, content) {
  const result = await pool.query(
    `UPDATE messages SET content = $1, edited = true, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [content, messageId]
  );
  return result.rows[0];
}

export async function softDeleteMessage(messageId) {
  const result = await pool.query(
    `UPDATE messages SET deleted = true, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [messageId]
  );
  return result.rows[0];
}

export async function getMessageReplyContext(replyToId) {
  const result = await pool.query(
    `SELECT id, content, user_id, u.username
     FROM messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.id = $1 AND m.deleted = false`,
    [replyToId]
  );
  return result.rows[0];
}

export async function getMessageWithAttachments(messageId) {
  const message = await findMessageById(messageId);
  if (!message) return null;

  const attachments = await attachmentQueries.getMessageAttachments(messageId);
  return { ...message, attachments };
}
