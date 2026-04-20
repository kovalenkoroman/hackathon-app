import pool from '../index.js';

export async function getUnreadCountsForUser(userId) {
  // Compare by message id, not created_at — edits can push created_at backward
  // or the seed can backdate rows, leaving old messages counted forever.
  const result = await pool.query(
    `
    SELECT
      r.id as room_id,
      r.name,
      r.visibility,
      COALESCE(COUNT(m.id), 0) as unread_count
    FROM rooms r
    LEFT JOIN room_members rm ON r.id = rm.room_id AND rm.user_id = $1
    LEFT JOIN messages m ON r.id = m.room_id
      AND m.deleted = false
      AND m.id > COALESCE(
        (SELECT last_read_message_id FROM user_room_read WHERE user_id = $1 AND room_id = r.id),
        0
      )
    WHERE rm.user_id = $1
    GROUP BY r.id, r.name, r.visibility
    HAVING COALESCE(COUNT(m.id), 0) > 0
    `,
    [userId]
  );

  const dialogResult = await pool.query(
    `
    SELECT
      pd.id as dialog_id,
      CASE
        WHEN pd.user_a_id = $1 THEN pd.user_b_id
        ELSE pd.user_a_id
      END as other_user_id,
      u.username,
      COALESCE(COUNT(m.id), 0) as unread_count
    FROM personal_dialogs pd
    LEFT JOIN messages m ON pd.id = m.dialog_id
      AND m.deleted = false
      AND m.id > COALESCE(
        (SELECT last_read_message_id FROM user_dialog_read WHERE user_id = $1 AND dialog_id = pd.id),
        0
      )
    JOIN users u ON CASE
      WHEN pd.user_a_id = $1 THEN u.id = pd.user_b_id
      ELSE u.id = pd.user_a_id
    END
    WHERE (pd.user_a_id = $1 OR pd.user_b_id = $1)
    GROUP BY pd.id, other_user_id, u.username
    HAVING COALESCE(COUNT(m.id), 0) > 0
    `,
    [userId]
  );

  return {
    rooms: result.rows,
    dialogs: dialogResult.rows
  };
}

export async function markRoomAsRead(userId, roomId, lastMessageId) {
  await pool.query(
    `
    INSERT INTO user_room_read (user_id, room_id, last_read_message_id, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id, room_id) DO UPDATE
    SET last_read_message_id = $3, updated_at = NOW()
    `,
    [userId, roomId, lastMessageId]
  );
}

export async function markDialogAsRead(userId, dialogId, lastMessageId) {
  await pool.query(
    `
    INSERT INTO user_dialog_read (user_id, dialog_id, last_read_message_id, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id, dialog_id) DO UPDATE
    SET last_read_message_id = $3, updated_at = NOW()
    `,
    [userId, dialogId, lastMessageId]
  );
}
