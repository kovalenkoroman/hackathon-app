import pool from '../index.js';

export async function createAttachment(messageId, filename, originalName, size, mimeType) {
  const result = await pool.query(
    `INSERT INTO attachments (message_id, filename, original_name, size, mime_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [messageId, filename, originalName, size, mimeType]
  );
  return result.rows[0];
}

export async function findAttachmentById(attachmentId) {
  const result = await pool.query(
    'SELECT * FROM attachments WHERE id = $1',
    [attachmentId]
  );
  return result.rows[0];
}

export async function getMessageAttachments(messageId) {
  const result = await pool.query(
    'SELECT * FROM attachments WHERE message_id = $1 ORDER BY created_at DESC',
    [messageId]
  );
  return result.rows;
}

export async function deleteAttachment(attachmentId) {
  const result = await pool.query(
    'DELETE FROM attachments WHERE id = $1 RETURNING *',
    [attachmentId]
  );
  return result.rows[0];
}
