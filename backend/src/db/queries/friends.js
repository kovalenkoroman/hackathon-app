import pool from '../index.js';

export async function createFriendRequest(requesterId, addresseeId, message = null) {
  const result = await pool.query(
    `INSERT INTO friendships (requester_id, addressee_id, status, message)
     VALUES ($1, $2, 'pending', $3)
     RETURNING *`,
    [requesterId, addresseeId, message]
  );
  return result.rows[0];
}

export async function acceptFriendRequest(friendshipId, userId) {
  const result = await pool.query(
    `UPDATE friendships SET status = 'accepted'
     WHERE id = $1 AND (addressee_id = $2 OR requester_id = $2)
     RETURNING *`,
    [friendshipId, userId]
  );
  return result.rows[0];
}

export async function removeFriend(friendshipId, userId) {
  const result = await pool.query(
    `DELETE FROM friendships
     WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)
     RETURNING *`,
    [friendshipId, userId]
  );
  return result.rows[0];
}

export async function getFriendship(friendshipId) {
  const result = await pool.query(
    'SELECT * FROM friendships WHERE id = $1',
    [friendshipId]
  );
  return result.rows[0];
}

export async function getFriendshipBetween(userId1, userId2) {
  const result = await pool.query(
    `SELECT * FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2)
        OR (requester_id = $2 AND addressee_id = $1)`,
    [userId1, userId2]
  );
  return result.rows[0];
}

export async function listFriends(userId) {
  const result = await pool.query(
    `SELECT f.id, CASE
       WHEN f.requester_id = $1 THEN f.addressee_id
       ELSE f.requester_id
     END as friend_id,
     u.username, u.email, f.status, f.created_at
     FROM friendships f
     JOIN users u ON (CASE
       WHEN f.requester_id = $1 THEN f.addressee_id = u.id
       ELSE f.requester_id = u.id
     END)
     WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function listPendingRequests(userId) {
  const result = await pool.query(
    `SELECT f.id, f.requester_id, f.addressee_id, u.username, u.email, f.message, f.created_at
     FROM friendships f
     JOIN users u ON f.requester_id = u.id
     WHERE f.addressee_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function listBans(bannerId) {
  const result = await pool.query(
    `SELECT b.banned_id as user_id, u.username, u.email, b.created_at
     FROM user_bans b
     JOIN users u ON b.banned_id = u.id
     WHERE b.banner_id = $1
     ORDER BY b.created_at DESC`,
    [bannerId]
  );
  return result.rows;
}

export async function dialogExistsBetween(userId1, userId2) {
  const result = await pool.query(
    `SELECT id FROM personal_dialogs
     WHERE (user_a_id = $1 AND user_b_id = $2)
        OR (user_a_id = $2 AND user_b_id = $1)`,
    [userId1, userId2]
  );
  return result.rows[0];
}

export async function banUser(bannerId, bannedId) {
  const result = await pool.query(
    `INSERT INTO user_bans (banner_id, banned_id)
     VALUES ($1, $2)
     RETURNING *`,
    [bannerId, bannedId]
  );
  return result.rows[0];
}

export async function unbanUser(bannerId, bannedId) {
  await pool.query(
    `DELETE FROM user_bans WHERE banner_id = $1 AND banned_id = $2`,
    [bannerId, bannedId]
  );
}

export async function isUserBanned(bannerId, bannedId) {
  const result = await pool.query(
    `SELECT * FROM user_bans WHERE banner_id = $1 AND banned_id = $2`,
    [bannerId, bannedId]
  );
  return result.rows.length > 0;
}

export async function getOrCreateDialog(userId1, userId2) {
  let dialog = await pool.query(
    `SELECT * FROM personal_dialogs
     WHERE (user_a_id = $1 AND user_b_id = $2)
        OR (user_a_id = $2 AND user_b_id = $1)`,
    [userId1, userId2]
  );

  if (dialog.rows.length === 0) {
    const result = await pool.query(
      `INSERT INTO personal_dialogs (user_a_id, user_b_id)
       VALUES ($1, $2)
       RETURNING *`,
      [userId1, userId2]
    );
    return result.rows[0];
  }

  return dialog.rows[0];
}
