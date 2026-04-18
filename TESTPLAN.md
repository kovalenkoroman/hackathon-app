# TESTPLAN.md — Online Chat Server

Derived from `2026_04_18_AI_requirements.docx` plus the design hints in `Additional_implementation_hints__design_caveats_and_reminders`.

This plan is the **source of truth for what "done" means**. Every requirement in the spec maps to at least one test ID below. Requirements without test coverage are by definition unverified and should be treated as not-yet-implemented.

---

## 1. How to Use This Document

1. Before implementing a feature, locate its test IDs here.
2. Generate the corresponding test file as `test.skip(...)` stubs with the descriptive name.
3. Implement the feature.
4. Un-skip the tests one by one until green.
5. When a test is green, mark its row with ✅ in the traceability matrix at the bottom.

**Rule:** no feature is considered delivered until its tests pass against a fresh `docker compose up`.

---

## 2. Test Layers

| Layer | Share | Tools | Scope |
|---|---|---|---|
| Unit | ~50% | Vitest / Jest / pytest | Pure domain logic — permission checks, presence state machine, watermark math, ban cascades, input validation |
| Integration | ~35% | Vitest + Supertest + socket.io-client + Testcontainers (real Postgres, real Redis) | HTTP endpoints, WS event flows, DB state transitions, file storage effects |
| E2E | ~15% | Playwright with 2–3 browser contexts | Multi-user flows, UI correctness, tab-level presence behavior |
| Load smoke | bonus | Custom Node/k6 harness | 300 concurrent WS clients, fanout latency |

**Non-negotiables for integration tests:**
- No mocks for Postgres or Redis. Use Testcontainers.
- WebSocket tests use a real `socket.io-client`, not stubs.
- Each test gets a fresh schema (truncate or migrate-per-suite).

---

## 3. Test ID Convention

`IT-<AREA>-<NN>` — integration test
`UT-<AREA>-<NN>` — unit test
`E2E-<AREA>-<NN>` — end-to-end test
`LT-<AREA>-<NN>` — load test

Areas: `AUTH`, `PRES`, `ROOM`, `FRIEND`, `DM`, `MSG`, `ATT`, `NOTIF`, `ADMIN`, `SEC`, `XMPP`.

---

## 4. Priority 1 — Authentication & Accounts

Maps to spec §2.1, §2.2.4.

### Unit

- **UT-AUTH-01** Password hash function produces different hash for same input (salt present).
- **UT-AUTH-02** Password verification succeeds for correct password, fails for wrong.
- **UT-AUTH-03** Email normalization (lowercase, trim) applied before uniqueness check.
- **UT-AUTH-04** Username validation rejects whitespace, empty, > 32 chars, reserved names (`admin`, `system`).
- **UT-AUTH-05** Session token generator produces cryptographically random 256-bit values.

### Integration

- **IT-AUTH-01** `POST /api/auth/register` with valid email+username+password → 201, row present in `users`, `password_hash` ≠ password, bcrypt/argon2 prefix detected.
- **IT-AUTH-02** Register duplicate email → 409, unique constraint not violated at DB level (pre-checked in service).
- **IT-AUTH-03** Register duplicate username → 409.
- **IT-AUTH-04** Register with malformed email → 400, no DB write.
- **IT-AUTH-05** `PATCH /api/users/me` attempting to change username → 400 or 403 with message "username is immutable".
- **IT-AUTH-06** `POST /api/auth/login` with valid creds → 200, `Set-Cookie` includes `HttpOnly`, `Secure` (in prod), `SameSite=Lax` or stricter.
- **IT-AUTH-07** Login with wrong password → 401, no timing leak (assert response time within ±20% of valid-login time across 50 runs).
- **IT-AUTH-08** Login persists across "browser restart" (drop in-memory client, replay cookie jar) → `/api/users/me` returns 200.
- **IT-AUTH-09** `POST /api/auth/logout` invalidates ONLY the current session. Create two sessions for user X (two cookie jars). Logout jar A. Jar B still calls `/api/users/me` successfully.
- **IT-AUTH-10** `POST /api/auth/password-reset/request` for known email → 202 and reset token created in DB (don't leak via response).
- **IT-AUTH-11** Password reset for unknown email → 202 (don't leak existence). No token created.
- **IT-AUTH-12** `POST /api/auth/password-reset/confirm` with valid token → password updated, all existing sessions invalidated, old password fails, new succeeds.
- **IT-AUTH-13** `POST /api/auth/password-change` as logged-in user with correct current password → updated. Other sessions optionally invalidated (confirm policy).
- **IT-AUTH-14** `GET /api/sessions` returns all active sessions for current user with browser/IP/last-seen.
- **IT-AUTH-15** `DELETE /api/sessions/:id` invalidates only that specific session. Current session not affected unless explicitly chosen.
- **IT-AUTH-16** `DELETE /api/users/me` (account deletion):
  - user row soft-deleted or anonymized
  - all rooms owned by user are deleted
  - all messages and attachment files in those owned rooms removed from disk
  - membership rows for user in other rooms removed
  - friendships removed
  - assert on filesystem that expected files are gone

### E2E

- **E2E-AUTH-01** Full flow: register → logout → login → delete account → login fails.
- **E2E-AUTH-02** Two browser contexts for same user: logout context A, context B continues to work.

---

## 5. Priority 2 — Presence & Multi-Tab

Maps to spec §2.2.1–2.2.3, NFR §3.2, and design hint #4.

### Unit

- **UT-PRES-01** Presence state machine: `[active heartbeat within 5s] → online`.
- **UT-PRES-02** `[no heartbeat 5s–60s, WS still connected] → AFK`.
- **UT-PRES-03** `[no WS connections] → offline`.
- **UT-PRES-04** Activity aggregator across N tabs: ANY tab active → user online. ALL tabs idle > 60s → AFK.
- **UT-PRES-05** Debouncer: rapid-fire activity signals collapse to at most 1 emit per second.

### Integration

- **IT-PRES-01** Client A connects WS, sends periodic activity heartbeat → observer (friend B) receives `presence: online` event within 2s.
- **IT-PRES-02** Client A stops sending heartbeats but keeps WS open → after 60s observer receives `presence: afk`.
- **IT-PRES-03** Client A closes WS → observer receives `presence: offline` within detection window (target: 5s).
- **IT-PRES-04** Two tabs for user A: Tab 1 active, Tab 2 idle → observer sees `online`.
- **IT-PRES-05** Two tabs, both idle > 60s, both WS still open → observer sees `afk`.
- **IT-PRES-06** Two tabs: close Tab 1, Tab 2 still active → observer still sees `online`.
- **IT-PRES-07** Close all tabs → observer sees `offline`.
- **IT-PRES-08** Presence propagation p95 latency < 2s over 50 trials (NFR 2.7.2 / 3.2).
- **IT-PRES-09** Tab "hibernated" simulation (stop sending heartbeat but keep socket artificially alive via server-side injection) → server still transitions to AFK correctly based on heartbeat timeout, not socket state.
- **IT-PRES-10** Only friends receive presence updates for a user (privacy check).

### E2E

- **E2E-PRES-01** User A in one Playwright context, User B (friend) in another. A is active → B sees "● online" indicator. A stops moving mouse for 65s → B sees "◐ AFK". A closes tab → B sees "○ offline".
- **E2E-PRES-02** Two tabs for User A, one active one backgrounded. B sees A as online throughout.

---

## 6. Priority 3 — Rooms, Membership, Moderation

Maps to spec §2.4, §4.5.

### Unit

- **UT-ROOM-01** Role permission matrix:
  - `owner` can: delete_room, remove_admin, remove_member, ban, delete_msg
  - `admin` can: remove_member, ban, delete_msg, remove_other_admin (not owner)
  - `member` can: send_msg, leave_room
- **UT-ROOM-02** Owner cannot lose admin status (attempt returns error).
- **UT-ROOM-03** Owner cannot leave own room (attempt returns error).
- **UT-ROOM-04** Room name validation: non-empty, length bounds, no forbidden chars.

### Integration

- **IT-ROOM-01** `POST /api/rooms` public → appears in `GET /api/rooms/public` catalog.
- **IT-ROOM-02** `POST /api/rooms` private → NOT in public catalog. Creator can still see it via `GET /api/rooms/mine`.
- **IT-ROOM-03** Create duplicate room name → 409.
- **IT-ROOM-04** Public catalog returns name, description, member_count per room.
- **IT-ROOM-05** Public catalog search by substring of name → filtered results.
- **IT-ROOM-06** `POST /api/rooms/:id/join` on public room as non-banned user → 200, member row created.
- **IT-ROOM-07** Join while on room ban list → 403.
- **IT-ROOM-08** Join private room without invitation → 403.
- **IT-ROOM-09** Join private room with valid invitation → 200, invitation consumed.
- **IT-ROOM-10** `POST /api/rooms/:id/leave` as member → 200, member row gone.
- **IT-ROOM-11** Leave as owner → 403 with message "owner cannot leave, delete room instead".
- **IT-ROOM-12** `DELETE /api/rooms/:id` as owner → room soft-deleted; ALL messages purged; ALL attachment files physically removed from volume (assert filesystem).
- **IT-ROOM-13** Delete as admin (non-owner) → 403.
- **IT-ROOM-14** `POST /api/rooms/:id/members/:uid/ban` as admin → member removed + ban row created. Banned user cannot rejoin via /join.
- **IT-ROOM-15** Banned user loses access: `GET /api/rooms/:id/messages` → 403. `GET /api/attachments/:id` for files in that room → 403.
- **IT-ROOM-16** `DELETE /api/rooms/:id/bans/:uid` (unban) as admin → user can rejoin.
- **IT-ROOM-17** `GET /api/rooms/:id/bans` returns username, banned_by, banned_at.
- **IT-ROOM-18** `POST /api/rooms/:id/admins/:uid` promotes member to admin (owner only).
- **IT-ROOM-19** Admin A removes admin B → succeeds. Admin A removes owner's admin status → 403.
- **IT-ROOM-20** Admin deletes another member's message → success, WS `message.deleted` event broadcast to room.
- **IT-ROOM-21** Non-admin member attempts to delete another member's message → 403.

### E2E

- **E2E-ROOM-01** Admin opens Manage Room modal → tabs for Members, Admins, Banned users, Invitations, Settings all render with correct data.
- **E2E-ROOM-02** Owner deletes room → room vanishes from all connected members' sidebars via WS.

---

## 7. Priority 4 — Friends & Direct Messages

Maps to spec §2.3, §2.5.1.

### Unit

- **UT-FRIEND-01** Friendship canonical key uses min(user_a, user_b) ordering so `A-B` and `B-A` resolve to same row.
- **UT-FRIEND-02** `canDM(a, b)` returns true only when friendship exists AND neither side has user-banned the other.

### Integration

- **IT-FRIEND-01** `POST /api/friends/requests` by username → pending request created, target user receives WS `friend.request` event.
- **IT-FRIEND-02** `POST /api/friends/requests` from room member list (passing user id) → works identically.
- **IT-FRIEND-03** Duplicate friend request while one is pending → 409 or no-op.
- **IT-FRIEND-04** Friend request to self → 400.
- **IT-FRIEND-05** `POST /api/friends/requests/:id/accept` → friendship created, WS event to both.
- **IT-FRIEND-06** `POST /api/friends/requests/:id/reject` → request marked rejected, no friendship.
- **IT-FRIEND-07** `DELETE /api/friends/:uid` (unfriend) → friendship removed. DMs frozen? Confirm — spec says only ban freezes DM history; unfriend should also prevent new DMs. Write test to pin chosen behavior.
- **IT-FRIEND-08** Send DM to non-friend → 403.
- **IT-FRIEND-09** `POST /api/users/:uid/ban` (user-to-user ban):
  - friendship terminated
  - A→B DMs blocked (403)
  - B→A DMs blocked (403)
  - existing DM history remains readable by both
  - existing DM channel is marked read-only — attempts to send by either party 403
- **IT-FRIEND-10** Unban after user-to-user ban → DMs remain blocked until friendship re-established (no auto-friend on unban).
- **IT-FRIEND-11** DM channel auto-creates on first DM between friends. Same channel reused thereafter.

### E2E

- **E2E-FRIEND-01** A sends request, B accepts, both see each other in Contacts with presence indicator.
- **E2E-FRIEND-02** A bans B, B's DM input field becomes disabled with a "conversation is frozen" banner.

---

## 8. Priority 5 — Messaging

Maps to spec §2.5, design hints #2 and #3.

### Unit

- **UT-MSG-01** Message body validation: empty → invalid, exactly 3072 bytes → valid, 3073 bytes → invalid.
- **UT-MSG-02** UTF-8 length is measured in BYTES not characters (emoji counts multiple bytes).
- **UT-MSG-03** Watermark allocator is monotonic per room and gap-free under normal operation.
- **UT-MSG-04** Reconciliation: if client has watermark W and receives W+2, gap detector flags missing W+1 and requests refetch.

### Integration

- **IT-MSG-01** User in room sends message via WS → all other room members connected receive event within 3s (NFR 3.2).
- **IT-MSG-02** Message persisted to `messages` table with correct `room_id`, `author_id`, `watermark`, `created_at`.
- **IT-MSG-03** Body at 3 KB boundary: exactly 3072 bytes → 200. 3073 bytes → 400.
- **IT-MSG-04** UTF-8 content with emoji, CJK, RTL text round-trips correctly.
- **IT-MSG-05** Multiline content preserves newlines.
- **IT-MSG-06** Reply-to: send message with `reply_to_message_id` → stored, returned in payload, visible in history fetch.
- **IT-MSG-07** Reply-to a deleted message → still allowed; UI shows "message deleted" placeholder.
- **IT-MSG-08** Edit own message via `PATCH /api/messages/:id` → `edited_at` set, `body` updated, WS `message.edited` event broadcast.
- **IT-MSG-09** Edit another user's message as non-admin → 403.
- **IT-MSG-10** Author deletes own message → soft-delete, WS event, history shows tombstone.
- **IT-MSG-11** Room admin deletes member's message → success.
- **IT-MSG-12** Room member deletes another member's message → 403.
- **IT-MSG-13** DM: only sender can delete their message. No admin concept in DMs.
- **IT-MSG-14** Offline delivery: send DM to offline user → message persisted. User connects → history includes message, unread indicator present.
- **IT-MSG-15** Watermark integrity: simulate WS disconnect, inject 3 messages via another client, reconnect original client → reconnect handshake returns watermark gap, client fetches missed messages, final state identical to recipient who stayed connected.
- **IT-MSG-16** History paging: `GET /api/rooms/:id/messages?before=<id>&limit=50` returns 50 prior messages in chronological order.
- **IT-MSG-17** History with seeded 10,000 messages: paging backward through all pages returns each message exactly once, strictly decreasing `created_at`.
- **IT-MSG-18** Concurrent send from two clients in same room: both messages stored, each gets distinct watermark, ordering stable.

### Stress / near-load

- **IT-MSG-19** 50 clients in one room, each sends 1 message/sec for 30s → no messages lost, p95 fanout latency < 3s.
- **IT-MSG-20** Message to 1000-member room → all connected members receive within 3s.

### E2E

- **E2E-MSG-01** Send, edit, delete a message; other user in second context sees all three states live.
- **E2E-MSG-02** Reply flow: click reply on message → quoted block appears in composer → sent message renders with quoted reference.
- **E2E-MSG-03** Infinite scroll: user scrolls up in long-history room → older messages progressively load, no duplicates, no scroll jump.
- **E2E-MSG-04** Autoscroll behavior: user at bottom gets autoscrolled on new message. User scrolled up does NOT get yanked down on new message; instead a "N new messages" pill appears.

---

## 9. Priority 6 — Attachments

Maps to spec §2.6, NFR §3.4.

### Unit

- **UT-ATT-01** File size validator: image ≤ 3 MB, other files ≤ 20 MB.
- **UT-ATT-02** MIME sniffing / image detection not trusting `Content-Type` header alone (check magic bytes).
- **UT-ATT-03** Filename sanitizer preserves original name for display but stores under UUID on disk.

### Integration

- **IT-ATT-01** Upload 3 MB image → 200, file on disk, row in `attachments`.
- **IT-ATT-02** Upload 3 MB + 1 byte image → 400.
- **IT-ATT-03** Upload 20 MB non-image file → 200.
- **IT-ATT-04** Upload 20 MB + 1 byte file → 400.
- **IT-ATT-05** Upload with optional comment → comment stored and returned on GET.
- **IT-ATT-06** Paste-upload path (multipart with inferred filename like `image.png`) works.
- **IT-ATT-07** Download file as current room member → 200 with correct `Content-Disposition: attachment; filename="<original>"`.
- **IT-ATT-08** Download as non-member → 403.
- **IT-ATT-09** Download from DM as non-participant → 403.
- **IT-ATT-10** Uploader gets banned from room → previously uploaded file still exists on disk but API returns 403 for the ex-uploader.
- **IT-ATT-11** Room deleted → all associated attachment files physically removed from disk. Assert via `fs.existsSync`.
- **IT-ATT-12** Concurrent uploads from 5 clients → all succeed, no filename collisions on disk (UUID scheme).
- **IT-ATT-13** Original filename preserved through UTF-8 (e.g., Cyrillic, Chinese filenames round-trip in Content-Disposition via RFC 5987 encoding).

### E2E

- **E2E-ATT-01** Drag-paste image in composer → preview renders → send → recipient sees inline image.
- **E2E-ATT-02** Non-image file shows as file card with filename, size, comment, download button.

---

## 10. Priority 7 — Notifications & Unread

Maps to spec §2.7, §4.4.

### Unit

- **UT-NOTIF-01** Unread counter increments on new message IFF user is NOT currently viewing that room.
- **UT-NOTIF-02** Unread counter clears on room open.

### Integration

- **IT-NOTIF-01** User A in room X. User B posts in room X. A's unread counter for X is 0 because A is viewing X.
- **IT-NOTIF-02** User A in room Y. User B posts in room X where A is also a member. A's unread counter for X increments. WS `unread.update` event delivered.
- **IT-NOTIF-03** A opens room X → unread cleared → WS event to all of A's sessions so other tabs update.
- **IT-NOTIF-04** Unread state survives disconnect/reconnect (persisted in `unread_cursors` table).
- **IT-NOTIF-05** DM unread indicator works identically to room unread.

### E2E

- **E2E-NOTIF-01** Two tabs open for user A. Tab 1 on room X, Tab 2 on room Y. Message arrives in X → Tab 1 no counter, Tab 2 shows counter on room X in sidebar.

---

## 11. Priority 8 — Security & Hardening

Cross-cutting, not a numbered spec section, but essential for "production-ready".

- **IT-SEC-01** Password stored with bcrypt/argon2 (never plaintext, MD5, or SHA1). Inspect DB directly.
- **IT-SEC-02** Session cookie is `HttpOnly` and `SameSite=Lax` or stricter.
- **IT-SEC-03** CSRF protection on state-changing REST endpoints (token or SameSite enforcement).
- **IT-SEC-04** Rate limiting on `/login` and `/register` (e.g., 10/min/IP). Exceed → 429.
- **IT-SEC-05** Authorization check on every message/room/attachment endpoint. Parametrize with attacker user and assert 403 across the board.
- **IT-SEC-06** SQL injection smoke: usernames/messages containing `'; DROP TABLE users; --` stored as literal text.
- **IT-SEC-07** XSS: message body with `<script>alert(1)</script>` rendered as text, not executed (React default escaping sufficient; verify).
- **IT-SEC-08** Path traversal on attachment download: `../../../etc/passwd` not served.
- **IT-SEC-09** Uploaded file served with `Content-Disposition: attachment` (never inline for non-image MIME) to prevent HTML-upload XSS.
- **IT-SEC-10** WebSocket auth: connecting without valid session cookie → rejected.
- **IT-SEC-11** WS event authorization: client subscribed to room X cannot emit message with `room_id: Y` and have it broadcast in Y.

---

## 12. Priority 9 — Load Smoke (aspirational)

Maps to NFR §3.1.

- **LT-LOAD-01** 300 concurrent WS clients across 10 rooms (30/room). Each client sends 1 message every 10s for 5 minutes. Measure:
  - Zero disconnects not attributable to test harness
  - p95 fanout latency < 3s
  - Server memory stable (no unbounded queue)
- **LT-LOAD-02** Single room with 1000 members, one sender posts 10 messages → all members receive all messages.
- **LT-LOAD-03** Design hint #1 verification: create a user who "never returns" — simulate message queue for offline user in room that sees 10K messages. Assert server-side queue is bounded (does NOT grow per-message per-offline-user). Messages should be paged from DB on reconnect, not buffered in memory.

---

## 13. Priority 10 (Optional) — Jabber / XMPP Federation

Maps to spec §6. Do not start until everything above is green.

- **IT-XMPP-01** External XMPP client (Gajim, Dino, or a test library like `@xmpp/client`) connects via port 5222, authenticates with existing web-app credentials.
- **IT-XMPP-02** Web user sends DM → XMPP client receives it.
- **IT-XMPP-03** XMPP client sends DM → web user receives it in real time.
- **IT-XMPP-04** Two servers in docker-compose (`server-a`, `server-b`) with s2s federation on port 5269. User `alice@server-a` DMs `bob@server-b`, message delivered.
- **IT-XMPP-05** Admin UI: Connection Dashboard shows list of connected XMPP sessions with JID, IP, connect time.
- **IT-XMPP-06** Admin UI: Federation Statistics shows s2s outgoing/incoming message counts per remote domain.

### Load

- **LT-XMPP-01** 50 clients connected to server-A, 50 to server-B. A-side clients each DM one B-side client. All messages delivered within 5s. No server crashes.

---

## 14. Cross-Cutting Tests

- **IT-DOCKER-01** Fresh clone, `docker compose up` → all services healthy within 60s. App serves 200 on `/`.
- **IT-DOCKER-02** Migrations run automatically on container start. Second `docker compose up` idempotent.
- **IT-DOCKER-03** Volumes persist data across `docker compose down` (without `-v`) and `up` again.
- **IT-DOCKER-04** App survives `docker compose restart app` without losing active sessions (sessions in Postgres, not in-memory).

---

## 15. Test Data Factories

All tests must use factories, not raw SQL inserts. Required factories:

- `createUser({ overrides })` → user with random email/username, password known to test
- `createSession(user)` → returns cookie jar ready to use
- `createRoom({ owner, visibility, overrides })`
- `addMember(room, user, role?)`
- `createMessage({ room, author, overrides })`
- `createAttachment({ message, sizeBytes, kind })` — writes real file to volume
- `createFriendship(a, b)` — pre-accepted
- `connectSocket(user)` → returns authenticated socket.io client with helpers

Store factories in `backend/test/factories/`. AI agents should be instructed: **never inline test data creation, always use factories.**

---

## 16. Traceability Matrix (fill as you go)

| Spec § | Requirement | Test IDs | Status |
|---|---|---|---|
| 2.1.1 | Self-registration | IT-AUTH-01, IT-AUTH-02, IT-AUTH-03 | ⬜ |
| 2.1.2 | Email/username unique, username immutable | IT-AUTH-02, IT-AUTH-03, IT-AUTH-05 | ⬜ |
| 2.1.3 | Login, logout, persistent session | IT-AUTH-06, IT-AUTH-08, IT-AUTH-09 | ⬜ |
| 2.1.4 | Password reset & change | IT-AUTH-10..13 | ⬜ |
| 2.1.5 | Account deletion cascades | IT-AUTH-16 | ⬜ |
| 2.2.1 | Presence states | IT-PRES-01..03 | ⬜ |
| 2.2.2 | AFK rule (1 min) | IT-PRES-02, UT-PRES-02 | ⬜ |
| 2.2.3 | Multi-tab presence | IT-PRES-04..07 | ⬜ |
| 2.2.4 | Active sessions management | IT-AUTH-14, IT-AUTH-15 | ⬜ |
| 2.3.1 | Friend list | IT-FRIEND-01, IT-FRIEND-05 | ⬜ |
| 2.3.2 | Friend requests by username or from room | IT-FRIEND-01, IT-FRIEND-02 | ⬜ |
| 2.3.3 | Friendship confirmation | IT-FRIEND-05, IT-FRIEND-06 | ⬜ |
| 2.3.4 | Remove friend | IT-FRIEND-07 | ⬜ |
| 2.3.5 | User-to-user ban effects | IT-FRIEND-09 | ⬜ |
| 2.3.6 | DM gating by friendship + bans | IT-FRIEND-08, IT-FRIEND-09 | ⬜ |
| 2.4.1 | Any user creates rooms | IT-ROOM-01, IT-ROOM-02 | ⬜ |
| 2.4.2 | Room properties, name unique | IT-ROOM-03 | ⬜ |
| 2.4.3 | Public catalog | IT-ROOM-01, IT-ROOM-04, IT-ROOM-05 | ⬜ |
| 2.4.4 | Private rooms by invite | IT-ROOM-02, IT-ROOM-08, IT-ROOM-09 | ⬜ |
| 2.4.5 | Join/leave, owner cannot leave | IT-ROOM-06, IT-ROOM-10, IT-ROOM-11 | ⬜ |
| 2.4.6 | Room deletion purges content | IT-ROOM-12 | ⬜ |
| 2.4.7 | Owner/admin role matrix | UT-ROOM-01, IT-ROOM-18..21 | ⬜ |
| 2.4.8 | Room ban rules | IT-ROOM-14..17 | ⬜ |
| 2.4.9 | Room invitations | IT-ROOM-09 | ⬜ |
| 2.5.1 | DM = 2-participant room | IT-FRIEND-11, IT-MSG-13 | ⬜ |
| 2.5.2 | Message content + 3 KB limit | IT-MSG-03, IT-MSG-04, IT-MSG-05 | ⬜ |
| 2.5.3 | Replies | IT-MSG-06, IT-MSG-07 | ⬜ |
| 2.5.4 | Edit with indicator | IT-MSG-08, IT-MSG-09 | ⬜ |
| 2.5.5 | Delete by author/admin | IT-MSG-10..13 | ⬜ |
| 2.5.6 | Ordering, history, offline delivery | IT-MSG-14..17 | ⬜ |
| 2.6.1 | Images + arbitrary files | IT-ATT-01, IT-ATT-03 | ⬜ |
| 2.6.2 | Upload + paste | IT-ATT-06 | ⬜ |
| 2.6.3 | Original filename + comment | IT-ATT-05, IT-ATT-13 | ⬜ |
| 2.6.4 | Access control | IT-ATT-07..09 | ⬜ |
| 2.6.5 | File persistence after uploader loses access | IT-ATT-10 | ⬜ |
| 2.7.1 | Unread indicators | IT-NOTIF-01..05 | ⬜ |
| 2.7.2 | Presence latency | IT-PRES-08 | ⬜ |
| 3.1 | Capacity 300 users / 1000 per room | LT-LOAD-01, LT-LOAD-02 | ⬜ |
| 3.2 | Performance: msg 3s, presence 2s | IT-MSG-01, IT-PRES-08 | ⬜ |
| 3.3 | Persistent history, infinite scroll | IT-MSG-17, E2E-MSG-03 | ⬜ |
| 3.4 | File storage limits | IT-ATT-01..04 | ⬜ |
| 3.5 | Session behavior | IT-AUTH-08, IT-AUTH-09 | ⬜ |
| 3.6 | Reliability / consistency | covered by all IT-ROOM, IT-MSG | ⬜ |
| 4.x | UI layout, autoscroll, admin modals | E2E-ROOM-01, E2E-MSG-04 | ⬜ |
| 6 | XMPP federation | IT-XMPP-01..06, LT-XMPP-01 | ⬜ |

---

## 17. Execution Order Recommendation

Implement in this order — each phase green before moving on:

1. **Foundation**: IT-DOCKER-01..04, IT-AUTH-01..09 → you now have a deployable authenticated shell.
2. **Rooms skeleton**: IT-ROOM-01..13 → rooms exist and are governed.
3. **Messaging**: IT-MSG-01..08, E2E-MSG-01 → core chat works.
4. **Presence**: IT-PRES-01..07 → users see each other's state.
5. **Friends + DMs**: IT-FRIEND-01..11 → private messaging works.
6. **Attachments**: IT-ATT-01..11 → files work.
7. **Notifications**: IT-NOTIF-01..05 → UX is complete.
8. **Moderation depth**: IT-ROOM-14..21 → admin features polished.
9. **Security pass**: all IT-SEC-xx → production-ready label earned.
10. **Load smoke**: LT-LOAD-01..03 → scale claim validated.
11. **Stretch**: IT-XMPP-xx.

---

## 18. Hackathon Submission Gate

The submission is acceptable to merge/tag when:

- All Priority 1–7 tests are ✅ in the matrix.
- `docker compose up` from a fresh clone passes IT-DOCKER-01.
- At least one E2E test per area (AUTH, ROOM, MSG, PRES, NOTIF) is green.
- Security priority tests IT-SEC-01, IT-SEC-02, IT-SEC-07, IT-SEC-11 are green.

Anything beyond that is bonus. Load tests and XMPP are explicitly stretch goals.
