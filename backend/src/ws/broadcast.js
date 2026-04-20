import * as presenceService from './presence.js';
import * as roomQueries from '../db/queries/rooms.js';
import pool from '../db/index.js';

export async function broadcastToRoom(roomId, event, exceptUserId = null) {
  const result = await pool.query('SELECT user_id FROM room_members WHERE room_id = $1', [
    roomId,
  ]);

  result.rows.forEach((row) => {
    if (exceptUserId && row.user_id === exceptUserId) return;
    presenceService.broadcastToUser(row.user_id, event);
  });
}

export async function broadcastToUser(userId, event) {
  presenceService.broadcastToUser(userId, event);
}

export async function broadcastToDialog(dialogId, event) {
  const result = await pool.query(
    'SELECT user_a_id, user_b_id FROM personal_dialogs WHERE id = $1',
    [dialogId]
  );
  if (!result.rows[0]) return;
  const { user_a_id, user_b_id } = result.rows[0];
  presenceService.broadcastToUser(user_a_id, event);
  presenceService.broadcastToUser(user_b_id, event);
}

export async function broadcastToFriends(userId, event, exceptUserId = null) {
  const result = await pool.query(
    `SELECT requester_id as friend_id FROM friendships WHERE addressee_id = $1 AND status = 'accepted'
     UNION
     SELECT addressee_id as friend_id FROM friendships WHERE requester_id = $1 AND status = 'accepted'`,
    [userId]
  );

  result.rows.forEach((row) => {
    if (exceptUserId && row.friend_id === exceptUserId) return;
    presenceService.broadcastToUser(row.friend_id, event);
  });
}

export async function broadcastPresenceToFriends(userId) {
  const presence = presenceService.getPresence(userId);

  const event = {
    type: 'presence:update',
    payload: {
      userId,
      status: presence.status,
    },
  };

  await broadcastToFriends(userId, event);
}

export async function broadcastPresenceToRoomMembers(userId) {
  const presence = presenceService.getPresence(userId);

  const event = {
    type: 'presence:update',
    payload: {
      userId,
      status: presence.status,
    },
  };

  const rooms = await roomQueries.getUserRooms(userId);
  for (const room of rooms) {
    await broadcastToRoom(room.id, event, userId);
  }
}
