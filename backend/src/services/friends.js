import * as friendQueries from '../db/queries/friends.js';
import * as userQueries from '../db/queries/users.js';
import * as messageQueries from '../db/queries/messages.js';
import { broadcastToUser } from '../ws/broadcast.js';
import pool from '../db/index.js';

export async function sendFriendRequest(requesterId, addresseeUsername) {
  const addressee = await userQueries.findUserByUsername(addresseeUsername);
  if (!addressee) throw new Error('User not found');
  if (addressee.id === requesterId) throw new Error('Cannot send request to yourself');

  const existing = await friendQueries.getFriendshipBetween(requesterId, addressee.id);
  if (existing) throw new Error('Friendship already exists or request pending');

  const requester = await userQueries.findUserById(requesterId);
  const request = await friendQueries.createFriendRequest(requesterId, addressee.id);

  // Notify addressee of friend request
  broadcastToUser(addressee.id, {
    type: 'friend:request',
    payload: { id: request.id, requesterId, requesterUsername: requester.username }
  });

  return request;
}

export async function acceptRequest(friendshipId, userId) {
  const friendship = await friendQueries.getFriendship(friendshipId);
  if (!friendship) throw new Error('Friendship request not found');
  if (friendship.addressee_id !== userId) throw new Error('You cannot accept this request');
  if (friendship.status !== 'pending') throw new Error('Friendship request already processed');

  const result = await friendQueries.acceptFriendRequest(friendshipId, userId);

  // Notify requester that request was accepted
  broadcastToUser(friendship.requester_id, {
    type: 'friend:accepted',
    payload: { id: friendshipId, accepterId: userId }
  });

  return result;
}

export async function removeFriend(friendshipId, userId) {
  const friendship = await friendQueries.getFriendship(friendshipId);
  if (!friendship) throw new Error('Friendship not found');
  if (friendship.requester_id !== userId && friendship.addressee_id !== userId) {
    throw new Error('You are not part of this friendship');
  }

  return await friendQueries.removeFriend(friendshipId, userId);
}

export async function banUser(bannerId, bannedId, bannedUsername = null) {
  if (bannerId === bannedId) throw new Error('Cannot ban yourself');

  if (bannedUsername) {
    const user = await userQueries.findUserByUsername(bannedUsername);
    if (!user) throw new Error('User not found');
    bannedId = user.id;
  }

  const isBanned = await friendQueries.isUserBanned(bannerId, bannedId);
  if (isBanned) throw new Error('User is already banned');

  // Remove existing friendship if any
  const existing = await friendQueries.getFriendshipBetween(bannerId, bannedId);
  if (existing) {
    await friendQueries.removeFriend(existing.id, bannerId);
  }

  return await friendQueries.banUser(bannerId, bannedId);
}

export async function unbanUser(bannerId, bannedId) {
  return await friendQueries.unbanUser(bannerId, bannedId);
}

export async function sendDM(senderId, recipientId, content) {
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required');
  }
  if (content.length > 5000) {
    throw new Error('Message is too long');
  }

  const isBanned = await friendQueries.isUserBanned(recipientId, senderId);
  if (isBanned) throw new Error('You are banned by this user');

  const isSenderBanned = await friendQueries.isUserBanned(senderId, recipientId);
  if (isSenderBanned) throw new Error('You have banned this user');

  const friendship = await friendQueries.getFriendshipBetween(senderId, recipientId);
  if (!friendship || friendship.status !== 'accepted') {
    throw new Error('You are not friends with this user');
  }

  const dialog = await friendQueries.getOrCreateDialog(senderId, recipientId);

  return await messageQueries.createMessage(dialog.id, senderId, content.trim(), null, true);
}

export async function getDMHistory(userId, otherId, beforeId = null, limit = 50) {
  const friendship = await friendQueries.getFriendshipBetween(userId, otherId);
  if (!friendship || friendship.status !== 'accepted') {
    throw new Error('You are not friends with this user');
  }

  const isBanned = await friendQueries.isUserBanned(otherId, userId);
  if (isBanned) throw new Error('You are banned by this user');

  const dialog = await friendQueries.getOrCreateDialog(userId, otherId);

  let query = `SELECT m.*, u.username, u.email
               FROM messages m
               JOIN users u ON m.user_id = u.id
               WHERE m.dialog_id = $1 AND m.deleted = false`;
  const params = [dialog.id];

  if (beforeId) {
    query += ` AND m.id < $2`;
    params.push(beforeId);
  }

  query += ` ORDER BY m.id DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows.reverse();
}

export async function getFriendsWithPresence(userId) {
  const friends = await friendQueries.listFriends(userId);
  // Presence data would come from presenceService in real impl
  return friends;
}
