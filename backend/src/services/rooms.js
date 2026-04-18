import * as roomQueries from '../db/queries/rooms.js';
import pool from '../db/index.js';

export async function createRoom(name, description, visibility, ownerId) {
  if (!name || name.trim().length === 0) throw new Error('Room name is required');
  if (name.length > 255) throw new Error('Room name is too long');
  if (!['public', 'private'].includes(visibility)) throw new Error('Invalid visibility');

  const room = await roomQueries.createRoom(name.trim(), description || null, visibility, ownerId);

  // Add owner as admin member
  await roomQueries.addRoomMember(room.id, ownerId, 'owner');

  return room;
}

export async function deleteRoom(roomId, userId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');
  if (room.owner_id !== userId) throw new Error('Only room owner can delete');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete all messages and their attachments
    await client.query('DELETE FROM attachments WHERE message_id IN (SELECT id FROM messages WHERE room_id = $1)', [roomId]);
    await client.query('DELETE FROM messages WHERE room_id = $1', [roomId]);

    // Delete room bans and members
    await client.query('DELETE FROM room_bans WHERE room_id = $1', [roomId]);
    await client.query('DELETE FROM room_members WHERE room_id = $1', [roomId]);

    // Delete room
    await client.query('DELETE FROM rooms WHERE id = $1', [roomId]);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function joinRoom(roomId, userId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');

  if (room.visibility === 'private') throw new Error('Cannot join private room without invite');

  const isBanned = await roomQueries.isRoomMemberBanned(roomId, userId);
  if (isBanned) throw new Error('You are banned from this room');

  const existing = await roomQueries.getRoomMember(roomId, userId);
  if (existing) return existing;

  return await roomQueries.addRoomMember(roomId, userId, 'member');
}

export async function leaveRoom(roomId, userId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');
  if (room.owner_id === userId) throw new Error('Room owner cannot leave');

  await roomQueries.removeRoomMember(roomId, userId);
}

export async function promoteToAdmin(roomId, targetUserId, actorUserId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');
  if (room.owner_id !== actorUserId) throw new Error('Only room owner can promote');

  const member = await roomQueries.getRoomMember(roomId, targetUserId);
  if (!member) throw new Error('User is not a room member');

  return await roomQueries.updateMemberRole(roomId, targetUserId, 'admin');
}

export async function demoteFromAdmin(roomId, targetUserId, actorUserId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');
  if (room.owner_id !== actorUserId) throw new Error('Only room owner can demote');

  const member = await roomQueries.getRoomMember(roomId, targetUserId);
  if (!member) throw new Error('User is not a room member');
  if (member.role !== 'admin') throw new Error('User is not an admin');

  return await roomQueries.updateMemberRole(roomId, targetUserId, 'member');
}

export async function banMember(roomId, targetUserId, actorUserId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');

  const actor = await roomQueries.getRoomMember(roomId, actorUserId);
  if (!actor || (actor.role !== 'owner' && actor.role !== 'admin')) {
    throw new Error('Only room admin or owner can ban members');
  }

  return await roomQueries.banRoomMember(roomId, targetUserId, actorUserId);
}

export async function unbanMember(roomId, targetUserId, actorUserId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');

  const actor = await roomQueries.getRoomMember(roomId, actorUserId);
  if (!actor || (actor.role !== 'owner' && actor.role !== 'admin')) {
    throw new Error('Only room admin or owner can unban members');
  }

  await roomQueries.unbanRoomMember(roomId, targetUserId);
}
