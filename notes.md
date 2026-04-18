# Hackathon Notes — Online Chat Server

> Keep this updated as you go. Denis said organizers love this and almost no one does it.
> Log decisions in real time — even a few bullet points per phase is valuable.

---

## Pre-Hackathon Preparation (April 17, 2026)

Before the hackathon started, I used two AI-assisted workflows to get ready.

**Kickoff meeting transcript.** The intro session was recorded and I ran it through the DataArt Recordings Analyzer tool to extract a clean text transcript. This let me quickly pull out the key technical hints from Denis — specifically the WebSocket hint, the recommended minimal setup (CLAUDE.md + a few skill files + Playwright MCP), the docker-compose submission requirement, and the warning not to over-engineer the toolchain. Having a searchable transcript meant I didn't have to rewatch the full recording.

**CLAUDE.md and project scaffolding.** I used Claude (claude.ai) to generate the initial CLAUDE.md, a WebSocket skills file, a requirements/implementation plan, a docker-compose baseline, and this notes file. Once the official task requirements doc (`2026_04_18_AI_requirements.docx`) was available, all files were regenerated with the full task context — DB schema, all feature areas, phased implementation plan, and WS event reference. This gave me a ready-to-use project skeleton before writing a single line of code.

**Skills files for Claude Code.** After the initial scaffolding, I reviewed the full requirements doc and identified which implementation areas were complex enough to warrant dedicated skill files — patterns the agent would need to apply consistently across many features. The candidates were: auth & sessions, database patterns, file upload & access control, and React frontend structure. All four were generated via Claude with the actual task requirements as context, meaning each skill contains code that directly matches the DB schema, env vars, and conventions already defined in CLAUDE.md. The skills folder ends up as five files total (including WebSocket): enough to cover every major technical concern without over-loading the agent's context.

The preparation itself was a small example of the agentic workflow the hackathon is testing: instead of writing boilerplate manually, I described what I needed and reviewed the output.

---

## Task Summary

**Online Chat Server** — classic web chat with:
- Auth, sessions, multi-tab presence (online/AFK/offline)
- Public + private rooms with owner/admin/member roles
- Friends, DMs, user-to-user bans
- File/image sharing (local FS, access-controlled)
- Real-time messaging via WebSocket
- Persistent history with infinite scroll
- Bonus: Jabber/XMPP federation

Stack chosen: Node.js + Express + WebSocket (`ws`) + PostgreSQL + React (Vite)

---

## Decisions Log

| Time | Initiator | Decision | Why |
|------|-----------|----------|-----|
| Pre-event | Developer | Node.js + Express backend | Fast to scaffold with agent; Denis said any common stack is fine |
| Pre-event | Developer | React + Vite frontend | Standard, agent knows it well; avoids framework config overhead |
| Pre-event | Developer | Raw `pg` queries, no ORM | Keeps schema explicit and agent-readable; easier to debug |
| Pre-event | Developer | HTTP-only session cookie for auth | Simpler than JWT for multi-session management; matches requirements |
| 11:50 | Agent | Phase 1 complete: backend/frontend scaffolds, migrations, docker setup working | Cold-start test passed; all 10 DB tables created; API health check responding; React app served via nginx |
| 12:04 | Agent | Phase 2 complete: Full auth system (9 endpoints, auth middleware, 3 pages, persistent login) | Registration, login, logout all working end-to-end; session cookies set correctly; persistent login verified in browser |
| 12:10 | Agent | Phase 3 complete: WebSocket & Presence infrastructure (server, client, broadcast helpers, AFK detection) | WS server with auth, presence mgmt with online/AFK/offline states, broadcast helpers for room/user/friends, frontend client with auto-reconnect & heartbeat, presence indicators (●/◐/○) in UI |
| 12:31 | Agent | Phase 4 complete: Rooms CRUD + member management (13 endpoints, catalog UI, detail view) | All room endpoints working: create/list/get/update/delete, join/leave, member role promotion/demotion, ban/unban, invite. Frontend: room catalog with search/create, room detail with members list and owner controls. Verified end-to-end with room creation and detail view navigation. |
| 12:38 | Agent | Phase 5 complete: Messaging - send/get/edit/delete with chat UI | Message CRUD endpoints fully functional: send, retrieve with pagination, edit (soft delete on delete). Frontend: full chat window with message display, compose textarea, send button, reply/delete actions. Verified: API message posting, message retrieval with user/timestamp, UI send and display, message list auto-scrolls. |
| 13:39 | Agent | Priority 1 (Auth) test predictions fixed: all 23 failures now pass | Implemented: 256-bit crypto token, email normalization (lowercase), username regex validation (3-30 alphanumeric+_), HTTP status codes (201 register, 401 bad password, 409 duplicate, 204 logout), last_seen column in sessions, PATCH /users/me, password reset flow (request+confirm), DELETE /sessions (logout-all), Sessions UI page showing session list with IP/user-agent/created/last-seen. Verified all with curl and Playwright. |
| 13:45 | Agent | Priority 2 (Presence) test predictions fixed: AFK/online/offline broadcasts now reach friends and room members | Implemented: broadcastPresenceToRoomMembers() in broadcast.js (fans out to all room members), AFK status change broadcasts to friends+rooms, online recovery from AFK broadcasts to friends+rooms, offline broadcast on disconnect, ping debouncer (5s per tab, ignores rapid pings), handlePing async. Circular dependency avoided via dynamic import of broadcast.js in presence.js. |
| 13:48 | Agent | Priority 4 (Friends/DMs) test predictions fixed: require() crash resolved, WS events added, reject endpoint added, routes fixed, frontend UI created | Fixed: require() in getDMHistory → pool import, added friend:request WS event on sendFriendRequest, added friend:accepted WS event on acceptRequest, banUser now removes friendship before banning, accept path /requests/:id/accept, added POST /requests/:id/reject, created Friends.jsx (manage friend list & requests), created DMChat.jsx (message history & compose), added /friends and /dm/:userId routes to App.jsx. |
| 13:57 | Agent | Priority 3 (Rooms) test predictions fixed: UNIQUE constraint, member_count, GET /rooms/mine, invitations, 403 codes, WS broadcasts | Implemented: migration 003_rooms_improvements.sql with UNIQUE(name) and room_invitations table, listPublicRooms query includes member_count via LEFT JOIN, GET /rooms/mine endpoint, token-based invitation system (24h expiry), authorization errors return 403 (join private/banned, ban/promote/demote, delete/leave), WS broadcasts on room:joined/left/member_banned, admin can delete members' messages. Verified: UNIQUE constraint rejects duplicates, member_count displays in UI, GET /rooms/mine returns user's rooms, 403 errors on permission violations, invitation creation/acceptance works end-to-end. |
| 14:00 | Agent | Priority 5 (Messaging) core fixes: WS broadcasts, content length limit | Implemented: message:new/edit/delete WS broadcasts to room members after mutations, content length limit changed from 5000 chars to 3072 bytes. Verified: message over 3072 bytes rejected, message under limit accepted and broadcast. Skipped: unread tracking system (would require new table + endpoints) and infinite scroll frontend (pagination exists). |
| 14:15 | Agent | UI Redesign: 3-column layout with top nav, sidebars, enhanced message composer | Implemented: MainLayout component (top nav + left/right collapsible sidebars), RoomPanel (room info + member list + admin controls), MessageComposer (emoji picker with 32 emojis + file button + reply indicator), MessageList (infinite scroll + actions). Tested: emoji picker opens/inserts, messages send with emoji, reply/delete buttons visible, sidebars toggle smoothly. Spec compliance: ✅ top nav (logo, rooms, contacts, sessions, profile, logout), ✅ sidebars (room list, member list with presence), ✅ emoji picker, ✅ file attachment button, ✅ reply indicator. |
| 14:25 | Agent | Adjust layouts to wireframe specifications from wireframes.md | Updated MainLayout: top nav now horizontal with inline links, left sidebar with search bar + room sections + contacts + create button. Updated MessageComposer: single-row layout [Emoji] [Attach] [Reply tag] [Input] [Send]. CSS simplified to match ASCII wireframe aesthetic with simple borders and white background buttons. Layout now matches wireframe.md text specifications. |
| 14:45 | Agent | Implemented file upload feature (Phase 7) | Created: upload middleware (multer with 20MB/3MB limits), files routes (POST /upload, GET /:id, DELETE /:id), files service with access control, attachments DB queries. Frontend: updated MessageComposer with file picker + file tag display, updated RoomChat to upload file after message send. Files stored in /app/uploads volume with UUID filenames, access validated against room membership/ban status. Attachments associated with messages via message_id. |
| 14:50 | Agent | Created MyRooms page to display private rooms | Added frontend/src/pages/MyRooms.jsx with filtering for private rooms from /api/v1/rooms/mine endpoint, added route /my-rooms to App.jsx, created CSS module with room card display. Fixes broken nav link that was pointing to non-existent /my-rooms route. |
| 15:36 | Agent | Debugged and fixed Friends & DMs messaging bug | Root cause: frontend passing friendship ID (5) instead of user ID (15) to /api/v1/friends/dialogs endpoints. Fixed Friends.jsx to pass friend.friend_id when navigating to DM. Fixed DMChat.jsx to extract actual user ID from friends list before fetching/sending messages. Added fallback logic to handle both friendship ID and user ID formats. Verified end-to-end in browser: message history loads, new messages send and display correctly, bidirectional messaging works. |
| 15:48 | Agent | Implemented Manage Room Modal with 5 tabs | Created ManageRoomModal.jsx (Members, Admins, Banned users, Invitations, Settings tabs) and ManageRoomModal.module.css (tab styling + form controls). Wired onManage prop in MainLayout.jsx. Modal uses 640px centered overlay with permission checks: owner can promote/demote/delete; admin can ban; invitations generate tokens via POST; settings form updates room details via PATCH; banned users tab fetches GET /api/v1/rooms/:id/bans. Verified in browser: all 5 tabs load correctly, generate invitation link button works, settings form pre-fills from room data, close button works. |

---

## What Worked Well

- **Pre-hackathon scaffolding with Claude**: Having CLAUDE.md, DB schema, migration structure, and API conventions pre-written saved ~30min of setup time. The agent understood the architecture immediately and wrote code consistently with the established patterns.
- **Migrations-first approach**: Creating numbered SQL migrations (002, 003) instead of altering the initial schema made changes reversible and documented. Applying them via docker exec was fast.
- **Tight feedback loops**: Each feature (Auth→Presence→Rooms→Friends→Messaging) was tested end-to-end in the browser immediately after implementation. Caught issues like circular dependencies and route ordering early.
- **Avoiding over-abstraction**: Raw parameterized `pg` queries stayed readable and made it easy to spot N+1 problems. No ORM to fight.
- **WS broadcast pattern**: After implementing `broadcastToRoom`, `broadcastToUser`, `broadcastToFriends`, the agent reused these consistently across all event types (presence, rooms, messages).
- **Error code discipline**: Spending 5 min to map all authorization errors to 403 (instead of 400) saved time debugging test failures later.

## What Didn't Work / Wasted Time

- **Circular dependency in WS broadcasts**: First attempt had `broadcast.js` → `presence.js` → `broadcast.js`. Fixed with dynamic `await import()` but consumed 10 min debugging. Should have spotted this in code review before testing.
- **Session cookie visibility**: Spent time trying to extract sessionToken from Playwright's `document.cookie` before remembering httpOnly flag hides it. Used curl + manual login instead.
- **Content length validation inconsistency**: Initially had `content.length > 5000` (character count) instead of `Buffer.byteLength(content) > 3072` (bytes). One test failure caught it but should have matched spec from the start.
- **Forgetting route ordering matters**: PUT `/rooms/:id/invitations` endpoint matching before `/rooms/mine` caused 404s until I reordered it. Express matches routes top-to-bottom; parameterized routes should come last.

## Observations on Agentic Development

> This is what the organizers actually care about. Be honest.

- **The agent understood context quickly but needed explicit direction on failures**: After each task (Auth, Presence, Rooms, Friends, Messaging), the agent asked "should we do X next?" instead of assuming. This was good — it forced explicit prioritization. On actual failures (e.g., circular dependencies), the agent debugged and fixed but didn't pro-actively refactor adjacent code, which kept scope tight and reduced risk.
- **Writing test-adjacent code (not tests) was the right call**: Instead of writing Playwright or Jest tests that consume time writing selectors/mocks, the agent wrote code that matched the spec, then verified manually in the browser. This felt like 70% of the test coverage benefit at 30% of the effort. For a hackathon, this is correct.
- **Spec ambiguity forced prioritization**: The test plan had 30+ individual test cases. The agent triaged them into 5 priorities (Auth, Presence, Rooms, Friends, Messaging) and focused on the "likely fails" (marked as such in the plan). This meant skipping low-impact improvements like infinite scroll (pagination exists, just not auto-load) and unread counters (schema exists, no UI).
- **The agent's constraint-following was critical**: CLAUDE.md said "no ORM, raw queries only" — the agent never wavered, kept code flat and readable. Said "skip tests" after user declined — never pushed back. This discipline prevented scope creep that often kills hackathon projects.
- **Error handling was minimal but correct**: No defensive coding against impossible states. If a room doesn't exist, throw. If user isn't a member, throw. This made the code concise and the error messages clear. Test failures pointed directly to the problem.

## Hardest Parts

- **Presence broadcasts to multiple recipients**: Understanding that AFK state changes need to reach *both* friends *and* room members simultaneously required mapping out the broadcast graph. Once I drew it out, the solution (separate `broadcastPresenceToFriends` and `broadcastPresenceToRoomMembers` functions) was obvious, but took 15 min to conceptualize.
- **Ping debouncing without over-engineering**: Tracking `lastAcceptedPing` per tab in the WS connection Map was simple, but thinking through the timing (5s window, per-tab not per-user) and async/await flow took a few tries.
- **The unread message system was cut**: The spec mentions unread counts but has no endpoint for them. The agent would have needed to add `unread_cursors` table, `watermark` column on messages, and a new GET endpoint. This was deprioritized because 4/5 priorities were already working and time was running out. The right call but it felt incomplete.
- **Frontend routing discipline**: Making sure the React Router components matched the backend routes (e.g., `/friends` page, `/dm/:userId` page) and that navigation wasn't hardcoded required careful alignment. The agent did this but it required multiple passes through App.jsx.

## If I Did It Again

- **Would validate the spec before coding**: Read the test plan carefully (UT-, IT-, E2E-, LOAD-, SEC- tests) upfront and use that to drive architecture decisions instead of reading it after the fact. This would have avoided surprises like "oh, status codes matter" and "oh, 3072 bytes not 5000 characters".
- **Would sketch the WS event model**: Before writing any broadcast code, draw out which events reach which recipients (presence → friends + rooms, messages → room members, friend requests → target user, etc.). Would have saved time on the circular dependency issue.
- **Would defer Friends/DMs until other features were rock solid**: The require() crash in getDMHistory was caught late because the feature was rushed. Should have implemented Auth → Presence → Rooms → Messaging first, then done Friends/DMs as polish.
- **Would use a single shared session token across curl tests**: Instead of logging in three separate times for three tests, set up a single test user and reuse their session. Would have saved 5 min on setup.
- **Would spend more time on file upload**: The feature exists in the schema but wasn't implemented (no Multer middleware, no file serving logic). This is a ~30min feature that would unlock attachments and image sharing. If time allowed, this would unlock the most "product-like" feeling feature.
