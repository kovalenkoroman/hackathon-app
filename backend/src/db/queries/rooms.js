import pool from '../index.js';

export async function createRoom(name, description, visibility, ownerId) {
  const result = await pool.query(
    `INSERT INTO rooms (name, description, visibility, owner_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, description, visibility, ownerId]
  );
  return result.rows[0];
}

export async function findRoomById(roomId) {
  const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
  return result.rows[0];
}

export async function listPublicRooms(search = '', limit = 50, offset = 0) {
  let query = `SELECT r.*, COUNT(rm.user_id)::int AS member_count
               FROM rooms r
               LEFT JOIN room_members rm ON r.id = rm.room_id
               WHERE r.visibility = $1`;
  const params = ['public'];

  if (search) {
    query += ' AND (r.name ILIKE $2 OR r.description ILIKE $2)';
    params.push(`%${search}%`);
  }

  query += ' GROUP BY r.id ORDER BY r.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

export async function updateRoom(roomId, updates) {
  const fields = [];
  const values = [roomId];
  let paramCount = 2;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramCount++}`);
    values.push(updates.description);
  }
  if (updates.visibility !== undefined) {
    fields.push(`visibility = $${paramCount++}`);
    values.push(updates.visibility);
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  const query = `UPDATE rooms SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function deleteRoom(roomId) {
  const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [roomId]);
  return result.rows[0];
}

export async function getRoomMembers(roomId) {
  const result = await pool.query(
    `SELECT rm.user_id, rm.role, rm.joined_at, u.username, u.email
     FROM room_members rm
     JOIN users u ON rm.user_id = u.id
     WHERE rm.room_id = $1
     ORDER BY rm.joined_at ASC`,
    [roomId]
  );
  return result.rows;
}

export async function addRoomMember(roomId, userId, role = 'member') {
  const result = await pool.query(
    `INSERT INTO room_members (room_id, user_id, role)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [roomId, userId, role]
  );
  return result.rows[0];
}

export async function removeRoomMember(roomId, userId) {
  await pool.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [
    roomId,
    userId,
  ]);
}

export async function getRoomMember(roomId, userId) {
  const result = await pool.query(
    'SELECT * FROM room_members WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  return result.rows[0];
}

export async function updateMemberRole(roomId, userId, role) {
  const result = await pool.query(
    `UPDATE room_members SET role = $1 WHERE room_id = $2 AND user_id = $3 RETURNING *`,
    [role, roomId, userId]
  );
  return result.rows[0];
}

export async function banRoomMember(roomId, userId, bannedBy) {
  const result = await pool.query(
    `INSERT INTO room_bans (room_id, user_id, banned_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [roomId, userId, bannedBy]
  );
  await removeRoomMember(roomId, userId);
  return result.rows[0];
}

export async function unbanRoomMember(roomId, userId) {
  await pool.query('DELETE FROM room_bans WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
}

export async function isRoomMemberBanned(roomId, userId) {
  const result = await pool.query(
    'SELECT * FROM room_bans WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  return result.rows.length > 0;
}

export async function getRoomBans(roomId) {
  const result = await pool.query(
    `SELECT rb.user_id, rb.banned_by, rb.created_at,
            u.username, admin.username as banned_by_username
     FROM room_bans rb
     JOIN users u ON rb.user_id = u.id
     LEFT JOIN users admin ON rb.banned_by = admin.id
     WHERE rb.room_id = $1
     ORDER BY rb.created_at DESC`,
    [roomId]
  );
  return result.rows;
}

export async function getUserRooms(userId) {
  const result = await pool.query(
    `SELECT r.*, rm.role FROM rooms r
     JOIN room_members rm ON r.id = rm.room_id
     WHERE rm.user_id = $1
     ORDER BY rm.joined_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function createInvitation(roomId, invitedBy, token, expiresAt) {
  const result = await pool.query(
    `INSERT INTO room_invitations (room_id, invited_by, token, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [roomId, invitedBy, token, expiresAt]
  );
  return result.rows[0];
}

export async function findInvitationByToken(token) {
  const result = await pool.query(
    `SELECT * FROM room_invitations
     WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
    [token]
  );
  return result.rows[0];
}

export async function markInvitationUsed(invitationId) {
  const result = await pool.query(
    `UPDATE room_invitations SET used_at = NOW() WHERE id = $1 RETURNING *`,
    [invitationId]
  );
  return result.rows[0];
}
