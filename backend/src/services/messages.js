import * as messageQueries from '../db/queries/messages.js';
import * as roomQueries from '../db/queries/rooms.js';

export async function sendMessage(roomId, userId, content, replyToId = null) {
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required');
  }
  if (content.length > 5000) {
    throw new Error('Message is too long');
  }

  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');

  const member = await roomQueries.getRoomMember(roomId, userId);
  if (!member) throw new Error('User is not a room member');

  const isBanned = await roomQueries.isRoomMemberBanned(roomId, userId);
  if (isBanned) throw new Error('You are banned from this room');

  if (replyToId) {
    const replyMsg = await messageQueries.findMessageById(replyToId);
    if (!replyMsg) throw new Error('Reply message not found');
  }

  return await messageQueries.createMessage(roomId, userId, content.trim(), replyToId);
}

export async function editMessage(messageId, userId, content) {
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required');
  }
  if (content.length > 5000) {
    throw new Error('Message is too long');
  }

  const message = await messageQueries.findMessageById(messageId);
  if (!message) throw new Error('Message not found');
  if (message.deleted) throw new Error('Cannot edit deleted message');

  if (message.user_id !== userId) {
    throw new Error('You can only edit your own messages');
  }

  return await messageQueries.updateMessage(messageId, content.trim());
}

export async function deleteMessage(messageId, userId) {
  const message = await messageQueries.findMessageById(messageId);
  if (!message) throw new Error('Message not found');
  if (message.deleted) throw new Error('Message is already deleted');

  if (message.user_id !== userId) {
    throw new Error('You can only delete your own messages');
  }

  return await messageQueries.softDeleteMessage(messageId);
}

export async function getMessageHistory(roomId, userId, beforeId = null, limit = 50) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');

  const member = await roomQueries.getRoomMember(roomId, userId);
  if (!member) throw new Error('You are not a room member');

  return await messageQueries.getMessagesByRoom(roomId, beforeId, limit);
}
