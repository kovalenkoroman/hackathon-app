import * as attachmentQueries from '../db/queries/attachments.js';
import * as messageQueries from '../db/queries/messages.js';
import * as roomQueries from '../db/queries/rooms.js';
import { unlink } from 'fs/promises';
import pool from '../db/index.js';

async function isDialogParticipant(dialogId, userId) {
  const result = await pool.query(
    'SELECT 1 FROM personal_dialogs WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)',
    [dialogId, userId]
  );
  return result.rows.length > 0;
}

export async function saveAttachment(messageId, file) {
  if (!file) {
    throw new Error('No file provided');
  }

  const attachment = await attachmentQueries.createAttachment(
    messageId,
    file.filename,
    file.originalname,
    file.size,
    file.mimetype
  );

  return attachment;
}

export async function getAttachment(attachmentId, userId) {
  const attachment = await attachmentQueries.findAttachmentById(attachmentId);
  if (!attachment) {
    throw new Error('Attachment not found');
  }

  const message = await messageQueries.findMessageById(attachment.message_id);
  if (!message) {
    throw new Error('Message not found');
  }

  // Access (req 2.6.4):
  // - Dialog: either of the two participants can download. We check participation
  //   in the dialog itself rather than friendship, so attachments remain viewable
  //   after a user-to-user block (req 2.3.5 "history remains visible but frozen").
  // - Room: must be a current member and not banned.
  if (message.dialog_id) {
    const participant = await isDialogParticipant(message.dialog_id, userId);
    if (!participant) throw new Error('Access denied');
  } else {
    const member = await roomQueries.getRoomMember(message.room_id, userId);
    if (!member) throw new Error('Access denied');

    const isBanned = await roomQueries.isRoomMemberBanned(message.room_id, userId);
    if (isBanned) throw new Error('Access denied');
  }

  return attachment;
}

export async function deleteAttachment(attachmentId, userId) {
  const attachment = await attachmentQueries.findAttachmentById(attachmentId);
  if (!attachment) throw new Error('Attachment not found');

  const message = await messageQueries.findMessageById(attachment.message_id);
  if (!message) throw new Error('Message not found');

  // Req 2.6.5: a user who has lost access to a room "can no longer see,
  // download, or manage" the file. So also require current access, not just
  // authorship/role.
  if (message.room_id) {
    const member = await roomQueries.getRoomMember(message.room_id, userId);
    if (!member) throw new Error('Access denied');
    const isBanned = await roomQueries.isRoomMemberBanned(message.room_id, userId);
    if (isBanned) throw new Error('Access denied');

    if (message.user_id !== userId && member.role !== 'admin' && member.role !== 'owner') {
      throw new Error('You can only delete your own attachments');
    }
  } else if (message.dialog_id) {
    const participant = await isDialogParticipant(message.dialog_id, userId);
    if (!participant) throw new Error('Access denied');
    if (message.user_id !== userId) {
      throw new Error('You can only delete your own attachments');
    }
  }

  try {
    await unlink(`/app/uploads/${attachment.filename}`);
  } catch (err) {
    console.error('Error deleting file from disk:', err);
  }

  return await attachmentQueries.deleteAttachment(attachmentId);
}
