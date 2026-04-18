-- Track last read message per user per room/dialog for unread count calculation

CREATE TABLE user_room_read (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  last_read_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, room_id)
);

CREATE TABLE user_dialog_read (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dialog_id INTEGER NOT NULL REFERENCES personal_dialogs(id) ON DELETE CASCADE,
  last_read_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, dialog_id)
);

CREATE INDEX idx_user_room_read_user_id ON user_room_read(user_id);
CREATE INDEX idx_user_dialog_read_user_id ON user_dialog_read(user_id);
