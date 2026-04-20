import * as messageQueries from '../db/queries/messages.js';
import * as roomQueries from '../db/queries/rooms.js';
import * as unreadQueries from '../db/queries/unread.js';
import * as broadcast from '../ws/broadcast.js';

export async function sendMessage(roomId, userId, content, replyToId = null) {
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required');
  }
  if (Buffer.byteLength(content) > 3072) {
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

  const message = await messageQueries.createMessage(roomId, userId, content.trim(), replyToId);
  await broadcast.broadcastToRoom(roomId, { type: 'message:new', payload: message });
  return message;
}

export async function editMessage(messageId, userId, content) {
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required');
  }
  if (Buffer.byteLength(content) > 3072) {
    throw new Error('Message is too long');
  }

  const message = await messageQueries.findMessageById(messageId);
  if (!message) throw new Error('Message not found');
  if (message.deleted) throw new Error('Cannot edit deleted message');

  if (message.user_id !== userId) {
    throw new Error('You can only edit your own messages');
  }

  const updated = await messageQueries.updateMessage(messageId, content.trim());
  const enriched = { ...updated, username: message.username };

  if (message.room_id) {
    await broadcast.broadcastToRoom(message.room_id, { type: 'message:edit', payload: enriched });
  } else if (message.dialog_id) {
    await broadcast.broadcastToDialog(message.dialog_id, { type: 'message:edit', payload: enriched });
  }

  return enriched;
}

export async function deleteMessage(messageId, userId) {
  const message = await messageQueries.findMessageById(messageId);
  if (!message) throw new Error('Message not found');
  if (message.deleted) throw new Error('Message is already deleted');

  if (message.user_id !== userId) {
    // Per spec 2.5.5, only room admins/owners can delete other users' messages.
    // Dialogs have no admin concept (spec 2.5.1), so only the author can delete.
    if (!message.room_id) {
      throw new Error('You can only delete your own messages');
    }
    const member = await roomQueries.getRoomMember(message.room_id, userId);
    if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
      throw new Error('You can only delete your own messages');
    }
  }

  const deleted = await messageQueries.softDeleteMessage(messageId);

  if (message.room_id) {
    await broadcast.broadcastToRoom(message.room_id, { type: 'message:delete', payload: { id: messageId } });
  } else if (message.dialog_id) {
    await broadcast.broadcastToDialog(message.dialog_id, { type: 'message:delete', payload: { id: messageId } });
  }

  return deleted;
}

export async function getMessageHistory(roomId, userId, beforeId = null, limit = 50) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');

  const member = await roomQueries.getRoomMember(roomId, userId);
  if (!member) throw new Error('You are not a room member');

  return await messageQueries.getMessagesByRoom(roomId, beforeId, limit);
}

export async function getUnreadCounts(userId) {
  return await unreadQueries.getUnreadCountsForUser(userId);
}

export async function markRoomAsRead(roomId, userId, lastMessageId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');

  const member = await roomQueries.getRoomMember(roomId, userId);
  if (!member) throw new Error('You are not a room member');

  await unreadQueries.markRoomAsRead(userId, roomId, lastMessageId);

  const counts = await unreadQueries.getUnreadCountsForUser(userId);
  await broadcast.broadcastToUser(userId, { type: 'unread:update', payload: counts });
}

export async function markDialogAsRead(dialogId, userId, lastMessageId) {
  await unreadQueries.markDialogAsRead(userId, dialogId, lastMessageId);

  const counts = await unreadQueries.getUnreadCountsForUser(userId);
  await broadcast.broadcastToUser(userId, { type: 'unread:update', payload: counts });
}
