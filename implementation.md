# Implementation Plan — Online Chat Server

Generated from `requirements.md`. Update checkboxes as features are completed.

---

## Phase 1: Foundation (target: ~1 hour) ✅ DONE

Goal: `docker compose up` boots the app with a working DB and a blank frontend.

- [x] Initialize backend: `npm init`, install `express`, `ws`, `pg`, `bcrypt`, `multer`, `uuid`, `cookie-parser`
- [x] Initialize frontend: `npm create vite@latest` with React template
- [x] Write `docker-compose.yml` — app + postgres + uploads volume
- [x] Write `Dockerfile` for backend (node:20-alpine) and frontend (node:20-alpine + nginx)
- [x] Write `.env.example` with all required vars
- [x] Write migration `001_init.sql` — full schema (users, sessions, rooms, room_members, room_bans, friendships, user_bans, messages, personal_dialogs, attachments)
- [x] Wire backend entry point: HTTP server + WebSocket server on same port
- [x] Verify cold start: `docker compose up --build` → app responds on :3000

---

## Phase 2: Auth & Sessions (target: ~1 hour)

- [ ] `POST /api/v1/auth/register` — validate uniqueness, hash password, create user
- [ ] `POST /api/v1/auth/login` — verify credentials, create session, set HTTP-only cookie
- [ ] `POST /api/v1/auth/logout` — delete current session, clear cookie
- [ ] `GET /api/v1/auth/me` — return current user from session cookie
- [ ] `POST /api/v1/auth/password/reset` — generate reset token, (log to console, no email needed)
- [ ] `POST /api/v1/auth/password/change` — change password for logged-in user
- [ ] `DELETE /api/v1/auth/account` — delete account + owned rooms + cascade
- [ ] `GET /api/v1/sessions` — list active sessions for current user
- [ ] `DELETE /api/v1/sessions/:id` — log out a specific session
- [ ] Auth middleware — validates cookie on every protected route
- [ ] Frontend: Login page, Register page, Forgot password page (matching wireframes)
- [ ] Frontend: Persistent login (check `/me` on app load)

---

## Phase 3: WebSocket & Presence (target: ~45 min)

- [ ] WS server setup: accept connections, require `auth` event with session token
- [ ] Track connections per user per tab in memory Map
- [ ] Presence manager: emit `presence:update` to relevant users on connect/disconnect/AFK
- [ ] AFK detection: client pings every 30s; server marks AFK after 60s silence
- [ ] Broadcast helpers: `broadcastToRoom(roomId, event)`, `broadcastToUser(userId, event)`, `broadcastToFriends(userId, event)`
- [ ] Frontend WS client: auto-reconnect with exponential backoff
- [ ] Frontend: show ●/◐/○ presence indicators in sidebar and member list

---

## Phase 4: Rooms (target: ~1.5 hours)

- [ ] `POST /api/v1/rooms` — create room
- [ ] `GET /api/v1/rooms` — public room catalog with search
- [ ] `GET /api/v1/rooms/:id` — room detail + members
- [ ] `POST /api/v1/rooms/:id/join` — join public room
- [ ] `POST /api/v1/rooms/:id/leave` — leave room (owner blocked)
- [ ] `DELETE /api/v1/rooms/:id` — owner deletes room + cascade
- [ ] `PATCH /api/v1/rooms/:id` — update name/description/visibility (owner/admin)
- [ ] `POST /api/v1/rooms/:id/members/:userId/ban` — ban member (treated as remove)
- [ ] `DELETE /api/v1/rooms/:id/bans/:userId` — unban
- [ ] `POST /api/v1/rooms/:id/admins/:userId` — promote to admin
- [ ] `DELETE /api/v1/rooms/:id/admins/:userId` — demote admin
- [ ] `POST /api/v1/rooms/:id/invitations` — invite user to private room
- [ ] `GET /api/v1/rooms/:id/bans` — list banned users with banner info
- [ ] WS: emit `room:joined`, `room:left`, `room:member_banned` events
- [ ] Frontend: sidebar room list (public + private sections, unread count badges)
- [ ] Frontend: room catalog page with search
- [ ] Frontend: Manage Room modal (Members / Admins / Banned / Invitations / Settings tabs per wireframe)

---

## Phase 5: Messaging (target: ~1 hour)

- [ ] `GET /api/v1/rooms/:id/messages?before=<id>&limit=50` — paginated history (infinite scroll)
- [ ] `DELETE /api/v1/messages/:id` — soft delete (author or admin)
- [ ] `PATCH /api/v1/messages/:id` — edit own message, set `edited=true`
- [ ] WS: `message:new` — broadcast to room on send
- [ ] WS: `message:edit`, `message:delete` — broadcast to room
- [ ] WS: reply-to payload includes quoted message snippet
- [ ] Frontend: chat window — auto-scroll to bottom when user is at bottom; no forced scroll when reading history
- [ ] Frontend: infinite scroll upward (IntersectionObserver on first message)
- [ ] Frontend: reply UI — "Replying to X ×" bar above input; quoted message in thread
- [ ] Frontend: edit message inline
- [ ] Frontend: "edited" grey indicator on edited messages
- [ ] Frontend: unread indicator cleared on open

---

## Phase 6: Friends & Personal Messaging (target: ~1 hour)

- [ ] `POST /api/v1/friends/request` — send friend request by username
- [ ] `POST /api/v1/friends/:id/accept` — accept request
- [ ] `DELETE /api/v1/friends/:id` — remove friend
- [ ] `POST /api/v1/users/:id/ban` — user-to-user ban
- [ ] `DELETE /api/v1/users/:id/ban` — unban
- [ ] `GET /api/v1/friends` — list friends with presence
- [ ] `GET /api/v1/friends/requests` — pending requests
- [ ] `GET /api/v1/dialogs/:userId/messages` — DM history (paginated)
- [ ] WS: `friend:request`, `friend:accepted` events
- [ ] Enforce: DMs only between mutual friends with no active ban
- [ ] Freeze DM history (read-only) after user-to-user ban
- [ ] Frontend: Contacts section in sidebar with presence
- [ ] Frontend: DM chat window (same UI as room chat, no admin actions)
- [ ] Frontend: friend request notifications

---

## Phase 7: File Attachments (target: ~45 min)

- [ ] `POST /api/v1/files/upload` — multer upload, validate size/type, save to `/app/uploads/<uuid>.<ext>`, return attachment record
- [ ] `GET /api/v1/files/:id` — serve file with access control (check room membership or dialog participation)
- [ ] Access revocation: middleware checks current membership before serving
- [ ] Cascade delete: room deletion removes files from disk
- [ ] Frontend: attach button → file picker
- [ ] Frontend: paste to attach (clipboard API)
- [ ] Frontend: file/image preview in message bubble with optional comment
- [ ] Frontend: image thumbnail; file shows filename + size

---

## Phase 8: Polish & Submission Prep (target: ~30 min)

- [ ] Error handling: all unhandled promise rejections caught, 500 responses never leak stack traces
- [ ] Input validation on all API routes (check required fields, lengths, types)
- [ ] Cold-start test: `git clone` → `cp .env.example .env` → `docker compose up --build` → all features work
- [ ] Update `notes.md` with observations, what worked, what didn't
- [ ] Push to public GitHub repo
- [ ] Fill in submission form with repo link + invoice

---

## Phase 9: Advanced / Bonus (only if phases 1–8 complete)

- [ ] Research available Node.js XMPP/Jabber library (e.g. `node-xmpp-server` or `xmpp.js`)
- [ ] Implement basic Jabber client connectivity
- [ ] Docker Compose setup for two federated server instances
- [ ] Admin UI: Jabber connection dashboard
- [ ] Admin UI: federation traffic statistics
- [ ] Load test: 50+ clients on each server, A↔B messaging
