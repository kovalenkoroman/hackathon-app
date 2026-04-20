# Hackathon Chat

Classic web-based chat server built for the DataArt hackathon: registration, public and private rooms, one-to-one direct messages with friends, file and image sharing, presence, moderation, persistent history.

## Run

```bash
cp .env.example .env
docker compose up --build
```

Open <http://localhost:3000>

The PostgreSQL volume is named; drop it with `docker compose down -v` if you want a clean slate.

## Test accounts

On a fresh database, five users are seeded, all with password `password123`:

| Email | Username |
|---|---|
| `alice@example.com` | alice |
| `bob@example.com` | bob |
| `charlie@example.com` | charlie |
| `diana@example.com` | diana |
| `eve@example.com` | eve |

Rooms, memberships, friendships and some sample messages are also seeded so reviewers can click around immediately.

## Running the test suite

With the stack running, from the repository root:

```bash
./tests/run.sh
```

Runs ~67 end-to-end API tests against the live server (curl + jq). Each run uses a timestamped suffix for its test data so re-runs don't collide with the seeded data.

See `tests/plan.md` for the full catalogue.

## Tech stack

- Node.js + Express for the HTTP API
- `ws` library for the WebSocket server
- PostgreSQL (plain `pg`, no ORM, raw parameterised queries)
- React + Vite for the frontend
- Local filesystem for file uploads (mounted as a Docker volume)
- lucide-react for icons, vanilla CSS modules + CSS variables for theming

## Features

### Functional (requirements §2)

- Registration, login, logout, persistent session cookie
- Password reset + change, account deletion with full cascade
- Sessions view per device, with selective revoke and "sign out other devices"
- Online / AFK / offline presence with real multi-tab rules (AFK only when all tabs idle)
- Public room catalog with search, private rooms via invitation
- Room roles: owner, admin, member; ban, kick, promote, demote
- Friend list with pending requests (optional note), block/unblock, blocked users tab
- 1-on-1 messaging with feature parity to rooms: reply, edit, delete, attachments, infinite scroll
- Rich composer: multiline text, emoji picker, file/image upload, reply-to, copy-paste file
- Reply context rendered inline, "edited" indicator, admin message deletion
- File uploads up to 20 MB; images up to 3 MB; access checked per room/dialog membership
- Unread indicators on rooms and contacts, cleared on open
- Real-time updates over WebSocket (messages, edits, deletes, presence, unread)

### UI (requirements §4)

- Top nav, center chat, input at bottom, left sidebar with rooms + contacts
- Right room panel with members and presence, auto-hidden outside rooms
- Accordion-style section collapse — when you enter a room the Rooms section compacts
- Autoscroll on new messages when already at the bottom; free scroll otherwise
- Infinite scroll for older history
- Modal dialogs for all admin actions (room settings, invite, ban list)
- Unread badges on rooms and contacts
- Light/dark theme toggle with system-preference default

### Skipped

- Section 6 (Jabber/XMPP federation) — deliberately out of scope for this submission.

## Project structure

```
backend/          Node + Express + ws server
  migrations/     SQL migrations (incl. 099_seed.sql for test data)
  src/routes/     REST handlers
  src/services/   Business logic
  src/db/         pg pool + query modules
  src/ws/         WebSocket server + broadcast helpers
frontend/         React + Vite SPA
  src/pages/      Page-level components
  src/components/ Shared UI (MessageList, MessageComposer, RoomPanel, …)
  src/hooks/      Theme + unread hooks
  src/ws/         WebSocket client
tests/            plan.md + run.sh end-to-end runner
hackathon-requirements.md   Original spec
notes.md          Running decisions log
```

## Environment variables

See `.env.example`. `docker-compose.yml` already provides sensible defaults; the `.env` file is only needed if you want to override them.

## How migrations are applied

Files in `backend/migrations/` are mounted into `/docker-entrypoint-initdb.d/` and executed in filename order on the first start of the database volume:

- `001_init.sql` — schema
- `002_auth_improvements.sql`, `003_rooms_improvements.sql`, `004_unread_tracking.sql`, `005_friend_request_message.sql` — schema deltas
- `099_seed.sql` — test data (runs last)

If you're upgrading an existing volume and want to re-seed, run `docker compose down -v` first.
