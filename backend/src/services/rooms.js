import * as roomQueries from '../db/queries/rooms.js';
import * as userQueries from '../db/queries/users.js';
import pool from '../db/index.js';
import * as broadcast from '../ws/broadcast.js';

export async function createRoom(name, description, visibility, ownerId) {
  if (!name || name.trim().length === 0) throw new Error('Room name is required');
  if (name.length > 255) throw new Error('Room name is too long');
  if (!['public', 'private'].includes(visibility)) throw new Error('Invalid visibility');

  try {
    const room = await roomQueries.createRoom(name.trim(), description || null, visibility, ownerId);

    // Add owner as admin member
    await roomQueries.addRoomMember(room.id, ownerId, 'owner');

    return room;
  } catch (error) {
    if (error.code === '23505') throw new Error('Room name already taken');
    throw error;
  }
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

  const member = await roomQueries.addRoomMember(roomId, userId, 'member');
  await broadcast.broadcastToRoom(roomId, { type: 'room:joined', payload: { roomId, userId } });
  return member;
}

export async function leaveRoom(roomId, userId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');
  if (room.owner_id === userId) throw new Error('Room owner cannot leave');

  await roomQueries.removeRoomMember(roomId, userId);
  await broadcast.broadcastToRoom(roomId, { type: 'room:left', payload: { roomId, userId } });
}

export async function kickMember(roomId, targetUserId, requestorId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');

  const requestor = await roomQueries.getRoomMember(roomId, requestorId);
  if (!requestor || (requestor.role !== 'owner' && requestor.role !== 'admin')) {
    throw new Error('Only room admin or owner can remove members');
  }

  const target = await roomQueries.getRoomMember(roomId, targetUserId);
  if (!target) throw new Error('User is not a member of this room');
  if (target.role === 'owner') throw new Error('Cannot remove the room owner');

  await roomQueries.removeRoomMember(roomId, targetUserId);
  await broadcast.broadcastToRoom(roomId, { type: 'room:left', payload: { roomId, userId: targetUserId } });
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

  const actor = await roomQueries.getRoomMember(roomId, actorUserId);
  if (!actor || (actor.role !== 'owner' && actor.role !== 'admin')) {
    throw new Error('Only room owner or admin can demote');
  }

  if (room.owner_id === targetUserId) {
    throw new Error('Cannot demote the room owner');
  }

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

  const result = await roomQueries.banRoomMember(roomId, targetUserId, actorUserId);
  await broadcast.broadcastToRoom(roomId, { type: 'room:member_banned', payload: { roomId, userId: targetUserId } });
  return result;
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

export async function createInvitation(roomId, userId, token, expiresAt) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');

  const member = await roomQueries.getRoomMember(roomId, userId);
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new Error('Only room owner or admin can create invitations');
  }

  return await roomQueries.createInvitation(roomId, userId, token, expiresAt);
}

export async function acceptInvitation(token, userId) {
  const invitation = await roomQueries.findInvitationByToken(token);
  if (!invitation) throw new Error('Invalid or expired invitation');

  const isBanned = await roomQueries.isRoomMemberBanned(invitation.room_id, userId);
  if (isBanned) throw new Error('You are banned from this room');

  const existing = await roomQueries.getRoomMember(invitation.room_id, userId);
  if (existing) {
    await roomQueries.markInvitationUsed(invitation.id);
    return existing;
  }

  const member = await roomQueries.addRoomMember(invitation.room_id, userId, 'member');
  await roomQueries.markInvitationUsed(invitation.id);
  await broadcast.broadcastToRoom(invitation.room_id, { type: 'room:joined', payload: { roomId: invitation.room_id, userId } });
  return member;
}

export async function inviteUserByUsername(roomId, username, actorId) {
  const room = await roomQueries.findRoomById(roomId);
  if (!room) throw new Error('Room not found');

  const actor = await roomQueries.getRoomMember(roomId, actorId);
  if (!actor || (actor.role !== 'owner' && actor.role !== 'admin')) {
    throw new Error('Only room owner or admin can invite members');
  }

  const targetUser = await userQueries.findUserByUsername(username);
  if (!targetUser) throw new Error('User not found');
  if (targetUser.id === actorId) throw new Error('Cannot invite yourself');

  const isBanned = await roomQueries.isRoomMemberBanned(roomId, targetUser.id);
  if (isBanned) throw new Error('This user is banned from the room');

  const existing = await roomQueries.getRoomMember(roomId, targetUser.id);
  if (existing) throw new Error('User is already a member of this room');

  const member = await roomQueries.addRoomMember(roomId, targetUser.id, 'member');
  await broadcast.broadcastToRoom(roomId, { type: 'room:joined', payload: { roomId, userId: targetUser.id } });
  return member;
}
