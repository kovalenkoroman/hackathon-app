# Project Overview

This is a production-ready **Online Chat Server** — a classic web-based chat application built during a DataArt hackathon. The goal is to minimize hand-written code and maximize output via AI agent prompting.

## Core Features (must implement)

- User registration, authentication, persistent sessions, multi-tab support
- Public and private chat rooms with owner/admin/member roles
- One-to-one personal messaging (friends only)
- Contacts/friends system with friend requests and user-to-user bans
- File and image sharing (up to 20 MB files, 3 MB images, local filesystem)
- Basic moderation: message deletion, member removal, room bans
- Persistent message history with infinite scroll
- Real-time presence: online / AFK / offline via WebSocket
- Unread message indicators

## Advanced Feature (implement if time allows)

- Jabber/XMPP protocol support with federation between two server instances
- Admin UI: Jabber connection dashboard, federation traffic stats

## Tech Stack

- **Backend**: Node.js + Express
- **Real-time**: WebSockets via `ws` library
- **Database**: PostgreSQL (raw parameterized queries via `pg`, no ORM)
- **File storage**: Local filesystem (`/uploads` directory, mounted as Docker volume)
- **Frontend**: React (Vite) — single page app
- **Containerization**: Docker + Docker Compose

## Project Structure

```
/
├── backend/
│   ├── src/
│   │   ├── routes/            # REST API route handlers (one file per resource)
│   │   ├── services/          # Business logic (auth, rooms, messages, files, presence)
│   │   ├── db/
│   │   │   ├── index.js       # pg pool setup
│   │   │   └── queries/       # SQL query functions grouped by domain
│   │   ├── ws/
│   │   │   ├── index.js       # WebSocket server setup + message router
│   │   │   ├── presence.js    # Online/AFK/offline state management
│   │   │   └── handlers/      # One handler file per WS event domain
│   │   ├── middleware/
│   │   │   ├── auth.js        # Session validation middleware
│   │   │   └── upload.js      # Multer file upload middleware
│   │   └── index.js           # Entry point — wires HTTP + WS servers
│   ├── migrations/            # Numbered SQL files: 001_init.sql, 002_rooms.sql, etc.
│   ├── uploads/               # Runtime file storage (gitignored, Docker volume)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page-level components (Chat, Login, Register, Sessions)
│   │   ├── ws/
│   │   │   └── client.js      # WebSocket client wrapper with auto-reconnect
│   │   ├── api/               # Fetch wrappers for each REST resource
│   │   └── main.jsx           # React entry point
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── requirements.md
├── implementation.md
└── notes.md
```

## Conventions

### API

- REST endpoints: `/api/v1/<resource>`
- Auth via HTTP-only session cookie (set on login, cleared on logout)
- Response shape: `{ data: ..., error: null }` or `{ data: null, error: "message" }`
- HTTP 200 success / 400 validation / 401 unauthenticated / 403 forbidden / 500 server error
- File uploads: `multipart/form-data` via `/api/v1/files/upload`

### Database

- snake_case for all table and column names
- Every table has: `id SERIAL PRIMARY KEY`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- Migrations are plain SQL in `/backend/migrations/`, numbered sequentially
- No ORM — raw parameterized queries only via `pg`
- Passwords hashed with `bcrypt` (cost factor 12)
- Session tokens stored in `sessions` table, referenced by HTTP-only cookie

### Key DB tables (agent must follow this schema)

```sql
users (id, email, username, password_hash, created_at, updated_at)
sessions (id, user_id, token, ip, user_agent, created_at, expires_at)
rooms (id, name, description, visibility, owner_id, created_at, updated_at)
room_members (room_id, user_id, role, joined_at)         -- role: owner|admin|member
room_bans (room_id, user_id, banned_by, created_at)
friendships (id, requester_id, addressee_id, status, created_at) -- status: pending|accepted
user_bans (id, banner_id, banned_id, created_at)
messages (id, room_id, user_id, content, reply_to_id, edited, deleted, created_at, updated_at)
-- room_id can reference either rooms.id or personal_dialogs.id
personal_dialogs (id, user_a_id, user_b_id, created_at)
attachments (id, message_id, filename, original_name, size, mime_type, created_at)
```

### WebSocket

- Server listens at `/ws` path
- All messages are JSON: `{ type: "event_name", payload: { ... } }`
- Client sends `auth` event immediately after connection with session token
- Key event types:
  - `message:new`, `message:edit`, `message:delete`
  - `presence:update` (online/afk/offline)
  - `room:joined`, `room:left`, `room:member_banned`
  - `friend:request`, `friend:accepted`
  - `typing:start`, `typing:stop`
- Client auto-reconnects on disconnect (exponential backoff, max 30s)

### Presence logic

- Backend tracks one WS connection per browser tab per user
- AFK: user sends `afk:ping` every 30s when active; backend marks AFK after 60s without ping
- Offline: all WS connections for a user are closed
- Presence broadcasts to all users who share a room or friendship with the affected user

### File storage

- Files saved to `/app/uploads/<uuid>.<ext>` inside the container
- Docker volume mounts this to persist across restarts
- Access control enforced at API level — check room membership before serving files
- Max file size: 20 MB; max image size: 3 MB (validated server-side)

### Environment variables (see .env.example)

```
DATABASE_URL=postgres://postgres:postgres@db:5432/chatapp
SESSION_SECRET=change_me_in_production
PORT=3000
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE_BYTES=20971520
MAX_IMAGE_SIZE_BYTES=3145728
```

### Frontend conventions

- React functional components + hooks only, no class components
- API calls via thin wrappers in `src/api/` (no raw fetch in components)
- WebSocket events handled centrally in `ws/client.js` — components subscribe via callbacks
- No CSS frameworks — plain CSS modules per component
- Routing: React Router v6

## How to Run

```bash
cp .env.example .env
docker compose up --build
```

- App: `http://localhost:3000`
- API: `http://localhost:3000/api/v1`
- WebSocket: `ws://localhost:3000/ws`

## Agent Instructions

When implementing a feature:
1. Read `requirements.md` and check `implementation.md` for what's already done
2. Check existing code before creating new files — reuse services and query functions
3. Follow the DB schema above exactly; write a new numbered migration if schema changes are needed
4. After implementing, use Playwright MCP to verify the feature works end-to-end in the browser
5. Mark the feature done in `implementation.md`
6. Never hardcode credentials, ports, or paths — always use environment variables

When in doubt about a requirement, refer to `requirements.md` section 5 (Notes and Clarifications).

## Interaction Log

After completing each significant task or conversation exchange, append a one-line entry to the `## Decisions Log` table in `notes.md` capturing: the time, who initiated it, what was done or decided, and why. Keep it to a single sentence — this is a running log of the agentic development process for the hackathon organisers, not a commit message. Format:

| HH:MM | Initiator | What happened / what was decided | Why / outcome |

Initiator is either `Agent` (Claude Code acted autonomously or suggested the change) or `Developer` (the human explicitly requested or directed the action).

Example entries:
- `| 10:15 | Developer | Implemented auth routes | Followed auth.md skill; session cookie approach worked first try |`
- `| 11:30 | Agent | Refactored message query to use LEFT JOIN | Agent identified N+1 query problem during Playwright verification |`
- `| 13:00 | Developer | Switched room deletion to use transaction | Cascade wasn't removing files on disk; added manual fs.unlinkSync loop |`
- `| 14:20 | Agent | Added input validation to all routes | Agent flagged missing length checks after reviewing requirements.md |`
