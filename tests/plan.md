# Test Plan — Online Chat Server

Derived from `hackathon-requirements.md`. Covers the functional requirements in Section 2. Runs end-to-end against the Docker stack via HTTP+cookies.

Run with: `./tests/run.sh` (requires a running `docker compose up`, plus `curl` and `jq`).

Each test run uses a timestamped suffix for user/room names so re-runs don't collide.

---

## 2.1 Auth & Account

| ID | Requirement | Description |
|----|---|---|
| AUTH-01 | 2.1.1 | Register with valid email/username/password → 201 |
| AUTH-02 | 2.1.2 | Register with duplicate email → 409 |
| AUTH-03 | 2.1.2 | Register with duplicate username → 409 |
| AUTH-04 | 2.1.3 | Login with correct credentials → 200 + cookie set |
| AUTH-05 | 2.1.3 | Login with wrong password → 401 |
| AUTH-06 | 2.1.3 | GET /auth/me with valid session → returns current user |
| AUTH-07 | 2.1.3 | Logout invalidates only current browser session |
| AUTH-08 | 2.1.2 | PATCH /auth/users/me with `username` is rejected (immutable) |
| AUTH-09 | 2.1.4 | Change password with wrong current → 400 |
| AUTH-10 | 2.1.4 | Change password with correct current → 200 and old password stops working |
| AUTH-11 | 2.2.4 | GET /auth/sessions lists sessions, current one flagged `isCurrent:true` |
| AUTH-12 | 2.2.4 | DELETE /auth/sessions removes other sessions, keeps current |

## 2.3 Contacts / Friends

| ID | Requirement | Description |
|----|---|---|
| FR-01 | 2.3.2 | Send friend request by username → 201 |
| FR-02 | 2.3.2 | Cannot send friend request to self → 400 |
| FR-03 | 2.3.3 | Recipient sees pending request; accept → friendship accepted |
| FR-04 | 2.3.1 | GET /friends lists accepted friends |
| FR-05 | 2.3.5 | Block user terminates friendship and blocks new DMs |
| FR-06 | 2.3.5 | After block, DM history remains readable (GET succeeds), POST rejected |
| FR-07 | 2.3.5 | GET /friends/bans lists blocked users |
| FR-08 | 2.3.4 | DELETE /friends/:id removes friendship |

## 2.4 Chat Rooms

| ID | Requirement | Description |
|----|---|---|
| ROOM-01 | 2.4.1 | Create room → 201, owner becomes room owner |
| ROOM-02 | 2.4.2 | Create with duplicate name → 400 |
| ROOM-03 | 2.4.3 | Public rooms appear in GET /rooms catalog |
| ROOM-04 | 2.4.4 | Private rooms do NOT appear in GET /rooms |
| ROOM-05 | 2.4.5 | Non-owner joins public room → added as member |
| ROOM-06 | 2.4.5 | Non-owner leaves room → removed |
| ROOM-07 | 2.4.5 | Owner cannot leave → 403 |
| ROOM-08 | 2.4.7 | Owner promotes member to admin → role updated |
| ROOM-09 | 2.4.7 | Non-owner member cannot promote → 403 |
| ROOM-10 | 2.4.8 | Admin removes member via /members/:uid/ban → banned and removed |
| ROOM-11 | 2.4.8 | Banned user cannot rejoin → 403 |
| ROOM-12 | 2.4.7 | Admin unbans user → user can join again |
| ROOM-13 | 2.4.5 | Owner deletes room → 200, room gone |
| ROOM-14 | 2.4.9 | Owner invites by username → target user becomes member |

## 2.5 Messaging

| ID | Requirement | Description |
|----|---|---|
| MSG-01 | 2.5.2 | Send text message to room → 201 with id |
| MSG-02 | 2.5.2 | Message larger than 3 KB → 400 |
| MSG-03 | 2.5.3 | Send reply with `replyToId` → message carries reply_to_id |
| MSG-04 | 2.5.4 | Edit own message → returns `edited:true` |
| MSG-05 | 2.5.4 | Edit another user's message → 400/403 |
| MSG-06 | 2.5.5 | Delete own message → 200 |
| MSG-07 | 2.5.5 | Room admin deletes another user's message → 200 |
| MSG-08 | 2.5.6 | GET /rooms/:id/messages returns messages in chronological order |
| MSG-09 | 2.5.1 | DM feature parity: send DM with replyToId → persisted |

## 2.6 Attachments

| ID | Requirement | Description |
|----|---|---|
| FILE-01 | 2.6.1 | Upload small file + link to message → 201 |
| FILE-02 | 2.6.3 | GET /rooms/:id/messages returns attachment with `original_name` |
| FILE-03 | 2.6.4 | Room member can download the file → 200 |
| FILE-04 | 2.6.4 | Non-member cannot download the file → 403 |
| FILE-05 | 3.4 | File upload larger than 20 MB → 400 (skipped by default in fast run) |

## 2.7 Unread Indicators

| ID | Requirement | Description |
|----|---|---|
| UNREAD-01 | 2.7.1 | Other user sends message → `GET /unreads` shows count > 0 for room |
| UNREAD-02 | 2.7.1 | `POST /rooms/:id/mark-read` clears the room's unread count |
| UNREAD-03 | 2.7.1 | DM unread count keyed by `other_user_id` (not dialog_id) |

---

## Pass criteria

A test passes when the server's response matches the expected status code and, where applicable, the expected JSON shape. A test prints `not ok N — description` with the actual value on failure. The runner exits non-zero if any test fails.
