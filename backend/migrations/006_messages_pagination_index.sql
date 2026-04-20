-- Composite indexes for cursor-paginated history scroll.
-- The existing single-column idx_messages_room_id / idx_messages_dialog_id
-- indexes find rows for a room but force a sort of all matches on each page
-- request, which becomes expensive past a few thousand messages. With
-- (room_id, id) Postgres can walk the btree in reverse and stop after LIMIT
-- rows, making page-N as fast as page-1 regardless of history depth.

CREATE INDEX IF NOT EXISTS idx_messages_room_id_id ON messages (room_id, id);
CREATE INDEX IF NOT EXISTS idx_messages_dialog_id_id ON messages (dialog_id, id);
