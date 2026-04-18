# Skill: Database Patterns

Use this skill for all DB setup, migrations, and query conventions.

---

## Pool setup (`backend/src/db/index.js`)

```js
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => console.error('Unexpected DB error', err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
```

---

## Migration conventions

- Files live in `backend/migrations/`, named `001_init.sql`, `002_rooms.sql`, etc.
- Docker Compose mounts this folder to `/docker-entrypoint-initdb.d/` — runs automatically on first start in alphabetical order
- Each migration is idempotent: use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
- Never drop or alter columns in a migration — add new columns only (safe for a hackathon)

### Base migration (`001_init.sql`)

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  owner_id INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_bans (
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS user_bans (
  id SERIAL PRIMARY KEY,
  banner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (banner_id, banned_id)
);

CREATE TABLE IF NOT EXISTS personal_dialogs (
  id SERIAL PRIMARY KEY,
  user_a_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
  dialog_id INT REFERENCES personal_dialogs(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK (length(content) <= 3072),
  reply_to_id INT REFERENCES messages(id),
  edited BOOLEAN NOT NULL DEFAULT FALSE,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (room_id IS NOT NULL AND dialog_id IS NULL) OR
    (room_id IS NULL AND dialog_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  message_id INT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size INT NOT NULL,
  mime_type TEXT NOT NULL,
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_dialog_id ON messages(dialog_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
```

---

## Query function pattern

Group queries by domain in `backend/src/db/queries/`. Each file exports plain async functions.

```js
// backend/src/db/queries/rooms.js
const db = require('../index');

async function getRoomById(roomId) {
  const { rows } = await db.query(
    `SELECT r.*, u.username AS owner_username
     FROM rooms r JOIN users u ON r.owner_id = u.id
     WHERE r.id = $1`,
    [roomId]
  );
  return rows[0] || null;
}

async function getPublicRooms(search = '') {
  const { rows } = await db.query(
    `SELECT r.id, r.name, r.description,
            COUNT(rm.user_id)::int AS member_count
     FROM rooms r
     LEFT JOIN room_members rm ON r.id = rm.room_id
     WHERE r.visibility = 'public'
       AND ($1 = '' OR r.name ILIKE '%' || $1 || '%')
     GROUP BY r.id
     ORDER BY member_count DESC`,
    [search]
  );
  return rows;
}

async function getUserRole(roomId, userId) {
  const { rows } = await db.query(
    'SELECT role FROM room_members WHERE room_id=$1 AND user_id=$2',
    [roomId, userId]
  );
  return rows[0]?.role || null;
}

module.exports = { getRoomById, getPublicRooms, getUserRole };
```

---

## Paginated messages (infinite scroll)

```js
// backend/src/db/queries/messages.js
async function getMessages(roomId, { before, limit = 50 }) {
  const { rows } = await db.query(
    `SELECT m.*, u.username,
            json_build_object('id', r.id, 'content', r.content, 'username', ru.username) AS reply_to
     FROM messages m
     JOIN users u ON m.user_id = u.id
     LEFT JOIN messages r ON m.reply_to_id = r.id
     LEFT JOIN users ru ON r.user_id = ru.id
     WHERE m.room_id = $1
       AND m.deleted = FALSE
       AND ($2::int IS NULL OR m.id < $2)
     ORDER BY m.id DESC
     LIMIT $3`,
    [roomId, before || null, limit]
  );
  return rows.reverse(); // return chronological order
}
```

---

## Transactions (use for multi-step writes)

```js
const client = await db.getClient();
try {
  await client.query('BEGIN');
  await client.query('DELETE FROM rooms WHERE id=$1 AND owner_id=$2', [roomId, userId]);
  await client.query('DELETE FROM attachments WHERE message_id IN (SELECT id FROM messages WHERE room_id=$1)', [roomId]);
  // cascade handles messages and members via FK, but files on disk need manual cleanup
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

---

## Key rules

- Always use parameterized queries (`$1`, `$2`...) — never string interpolation
- Never `SELECT *` in production queries — always name columns (prevents leaking `password_hash`)
- Use `::int`, `::text` casts when Postgres type inference may be ambiguous
- `ON DELETE CASCADE` handles most cleanup automatically — check the schema in `CLAUDE.md`
- For soft deletes (messages): set `deleted=TRUE`, never actually delete the row
- Unique constraint violations from Postgres have `err.code === '23505'` — catch and return 400
