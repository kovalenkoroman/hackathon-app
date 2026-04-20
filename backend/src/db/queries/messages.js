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
  return hydrateAttachments(result.rows.reverse());
}

// Attach the `attachments` array to each message in a single extra query,
// keyed by message_id. Avoids N+1 while also avoiding a LEFT JOIN that would
// duplicate messages with multiple attachments.
async function hydrateAttachments(messages) {
  if (messages.length === 0) return messages;
  const ids = messages.map((m) => m.id);
  const result = await pool.query(
    `SELECT id, message_id, filename, original_name, size, mime_type, created_at
       FROM attachments
      WHERE message_id = ANY($1)`,
    [ids]
  );
  const byMessage = new Map();
  for (const row of result.rows) {
    if (!byMessage.has(row.message_id)) byMessage.set(row.message_id, []);
    byMessage.get(row.message_id).push(row);
  }
  return messages.map((m) => ({ ...m, attachments: byMessage.get(m.id) || [] }));
}

export { hydrateAttachments };

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
