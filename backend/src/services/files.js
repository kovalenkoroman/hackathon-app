import * as attachmentQueries from '../db/queries/attachments.js';
import * as messageQueries from '../db/queries/messages.js';
import * as roomQueries from '../db/queries/rooms.js';
import * as friendQueries from '../db/queries/friends.js';
import { unlink } from 'fs/promises';

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

  // Check access: user must be a member of the room or participant in the dialog
  if (message.dialog_id) {
    // Personal dialog - check if user is a participant
    const friendship = await friendQueries.getFriendshipBetween(userId, message.user_id);
    if (!friendship || friendship.status !== 'accepted') {
      throw new Error('Access denied');
    }
  } else {
    // Room message - check membership
    const member = await roomQueries.getRoomMember(message.room_id, userId);
    if (!member) {
      throw new Error('Access denied');
    }

    // Check if user is banned
    const isBanned = await roomQueries.isRoomMemberBanned(message.room_id, userId);
    if (isBanned) {
      throw new Error('Access denied');
    }
  }

  return attachment;
}

export async function deleteAttachment(attachmentId, userId) {
  const attachment = await attachmentQueries.findAttachmentById(attachmentId);
  if (!attachment) {
    throw new Error('Attachment not found');
  }

  const message = await messageQueries.findMessageById(attachment.message_id);
  if (!message) {
    throw new Error('Message not found');
  }

  // Only the message author or room admin can delete attachments
  if (message.user_id !== userId) {
    const member = await roomQueries.getRoomMember(message.room_id, userId);
    if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
      throw new Error('You can only delete your own attachments');
    }
  }

  // Delete file from disk
  try {
    await unlink(`/app/uploads/${attachment.filename}`);
  } catch (err) {
    console.error('Error deleting file from disk:', err);
    // Continue even if file deletion fails
  }

  // Delete from database
  return await attachmentQueries.deleteAttachment(attachmentId);
}
