import * as friendQueries from '../db/queries/friends.js';
import * as userQueries from '../db/queries/users.js';
import * as messageQueries from '../db/queries/messages.js';
import { broadcastToUser } from '../ws/broadcast.js';
import pool from '../db/index.js';

export async function sendFriendRequest(requesterId, addresseeUsername, message = null) {
  const addressee = await userQueries.findUserByUsername(addresseeUsername);
  if (!addressee) throw new Error('User not found');
  if (addressee.id === requesterId) throw new Error('Cannot send request to yourself');

  // Cannot send a request to someone who has banned us or whom we've banned
  const weBanned = await friendQueries.isUserBanned(requesterId, addressee.id);
  if (weBanned) throw new Error('You have blocked this user');
  const theyBanned = await friendQueries.isUserBanned(addressee.id, requesterId);
  if (theyBanned) throw new Error('Cannot send request to this user');

  const existing = await friendQueries.getFriendshipBetween(requesterId, addressee.id);
  if (existing) throw new Error('Friendship already exists or request pending');

  const trimmed = message && message.trim().length > 0 ? message.trim().slice(0, 500) : null;
  const requester = await userQueries.findUserById(requesterId);
  const request = await friendQueries.createFriendRequest(requesterId, addressee.id, trimmed);

  broadcastToUser(addressee.id, {
    type: 'friend:request',
    payload: { id: request.id, requesterId, requesterUsername: requester.username, message: trimmed }
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

export async function sendDM(senderId, recipientId, content, replyToId = null) {
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required');
  }
  if (Buffer.byteLength(content) > 3072) {
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

  if (replyToId) {
    const replyMsg = await messageQueries.findMessageById(replyToId);
    if (!replyMsg) throw new Error('Reply message not found');
  }

  const dialog = await friendQueries.getOrCreateDialog(senderId, recipientId);
  const message = await messageQueries.createMessage(dialog.id, senderId, content.trim(), replyToId, true);

  // Hydrate with username so recipients see the author immediately (rooms pattern).
  const sender = await userQueries.findUserById(senderId);
  const enriched = { ...message, username: sender?.username, email: sender?.email };

  const { broadcastToDialog } = await import('../ws/broadcast.js');
  await broadcastToDialog(dialog.id, { type: 'message:new', payload: enriched });

  return enriched;
}

// Per requirement 2.3.5, existing dialog history must stay visible even after
// a user-to-user ban — it just becomes read-only. So we don't enforce friendship
// or ban status here; that check lives in sendDM for writes.
export async function getDMHistory(userId, otherId, beforeId = null, limit = 50) {
  const existing = await friendQueries.dialogExistsBetween(userId, otherId);
  if (!existing) return [];

  let query = `SELECT m.*, u.username, u.email
               FROM messages m
               JOIN users u ON m.user_id = u.id
               WHERE m.dialog_id = $1 AND m.deleted = false`;
  const params = [existing.id];

  if (beforeId) {
    query += ` AND m.id < $2`;
    params.push(beforeId);
  }

  query += ` ORDER BY m.id DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows.reverse();
}

// Used by the DMChat page to decide whether the composer should be shown.
// "frozen" means the user can read the history but not send new messages.
export async function getDialogStatus(userId, otherId) {
  const friendship = await friendQueries.getFriendshipBetween(userId, otherId);
  const weBlocked = await friendQueries.isUserBanned(userId, otherId);
  const theyBlocked = await friendQueries.isUserBanned(otherId, userId);

  const canSend = friendship?.status === 'accepted' && !weBlocked && !theyBlocked;

  let reason = null;
  if (weBlocked) reason = 'you-blocked';
  else if (theyBlocked) reason = 'they-blocked';
  else if (!friendship || friendship.status !== 'accepted') reason = 'not-friends';

  return { canSend, reason };
}

export async function getFriendsWithPresence(userId) {
  const friends = await friendQueries.listFriends(userId);
  // Presence data would come from presenceService in real impl
  return friends;
}
