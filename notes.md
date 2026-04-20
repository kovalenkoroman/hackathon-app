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
| Pre-event | Developer | Node.js + Express backend | Fast to scaffold with agent; any common stack was acceptable |
| Pre-event | Developer | React + Vite frontend | Standard stack the agent knows; avoids framework config overhead |
| Pre-event | Developer | Raw `pg` queries, no ORM | Keeps schema explicit and readable; easier to debug |
| Pre-event | Developer | HTTP-only session cookie for auth | Simpler than JWT for multi-session management |
| 11:50 | Agent | Phase 1: scaffolds, migrations, docker setup | Cold-start test green; 10 DB tables, health check, React served via nginx |
| 12:04 | Agent | Phase 2: full auth system | 9 endpoints + middleware + 3 pages; login/logout/persistent session verified |
| 12:10 | Agent | Phase 3: WebSocket + presence | WS with auth; online/AFK/offline; reconnect + heartbeat; presence dots in UI |
| 12:31 | Agent | Phase 4: rooms CRUD + member management | 13 endpoints; catalog UI, room detail, role promotion/ban/invite |
| 12:38 | Agent | Phase 5: messaging send/get/edit/delete | Chat window, compose, reply/delete actions, paginated history |
| 13:39 | Agent | Priority 1 (Auth) fixes | Crypto token, email/username normalization, correct status codes, password reset flow, Sessions UI |
| 13:45 | Agent | Priority 2 (Presence) fixes | AFK/online/offline broadcasts to friends + room members; ping debounce; dynamic import avoids circular dep |
| 13:48 | Agent | Priority 4 (Friends/DMs) fixes | require() → pool import; WS friend:request/accepted events; reject endpoint; Friends + DMChat pages |
| 13:57 | Agent | Priority 3 (Rooms) fixes | UNIQUE(name); member_count via JOIN; `/rooms/mine`; token invites; 403 on auth errors; room WS events |
| 14:00 | Agent | Priority 5 (Messaging) fixes | message:new/edit/delete broadcasts; 3072-byte content limit |
| 14:15 | Agent | 3-column UI: top nav, sidebars, composer | MainLayout, RoomPanel, MessageComposer (emoji + file + reply), MessageList |
| 14:25 | Agent | Layout pass to match wireframes | Horizontal top nav; search + room sections + contacts in sidebar; single-row composer |
| 14:45 | Agent | File upload feature | Multer limits, files routes, access control, attachments hydrated on messages |
| 14:50 | Agent | MyRooms page for private rooms | Filters `/rooms/mine` to private-only; fixes broken nav link |
| 15:36 | Agent | Friends/DM messaging bug | Frontend was passing friendship id instead of user id to dialogs endpoint |
| 15:48 | Agent | ManageRoomModal with 5 tabs | Members/Admins/Banned/Invitations/Settings with role-aware controls |
| 15:56 | Agent | Members tab: search, grid layout, per-role actions | `kickMember()` + DELETE route; per-row actions; presence badges |
| 16:17 | Agent | Invite by username | Replaced token UI with direct invite form; adds member + room:joined broadcast |
| 16:37 | Developer | Settings tab polish + data refresh on save | Removed redundant heading/cancel; refetches room + context after save |
| 16:40 | Developer | Room description now updates on main page after save | RoomChat listens to RoomContext changes; removes duplicated local state |
| 16:44 | Developer | Sidebar updates when room visibility changes | Extracted `fetchRooms`; re-runs after settings save so room moves categories |
| 16:47 | Developer | Unban bug (NaN user_id) | Modal was passing `ban.id`; backend returns `ban.user_id` |
| 16:57 | Agent | Contacts in left sidebar, click → DM | `/api/v1/friends` fetch; contact rows navigate to `/dm/:id` |
| 17:11 | Developer | Create room → navigate to it immediately | Replaced reload-catalog flow with `navigate(/rooms/:id)` |
| 18:52 | Developer | Account deletion (2.1.5) | Cascade-delete rooms/messages/sessions/friendships + upload files; two-step UI confirm |
| 18:58 | Developer | Password management (2.1.4) | ChangePassword + ResetPasswordConfirm pages; validates current/new/confirm |
| 19:04 | Developer | Room panel: owner → admins → members ordering | Members list shows regular members only; admins render as a separate section |
| 19:13 | Agent | Verified role permissions (2.4.7) | Admin can demote admin (not owner); 403 on all permission violations |
| 19:18 | Agent | Join/leave flow (2.4.5) | Leave button for non-owners with confirm; owner cannot leave |
| 21:36 | Agent | RoomCatalog Enter/Leave toggle | Fetches user's rooms; Enter for non-members, Leave for members |
| 01:38 | Developer | Reply context in message history | Shows "↪ Reply to @user" + preview above replies; fixed `reply_to_id` detection |
| 01:42 | Developer | Minimalist message design | Removed bubbles/borders; hover-revealed actions; tighter vertical rhythm |
| Apr 20 01:30 | Developer | ManageRoomModal polish pass | Tab scrollbar, invite button sizing, h3 vs label, input overflow |
| Apr 20 02:30 | Developer | App-wide page modernization | Unified card-and-surface style across all pages + modals |
| Apr 20 03:30 | Developer | §2.1–2.7 requirements audit | Fixed every missed behavior: auth edges, presence gaps, blocked-contact history, DM parity, attachment access, unreads |
| Apr 20 03:50 | Developer | Accordion sidebar (§4.1.1) | Rooms collapses in DMs; Contacts collapses in rooms |
| Apr 20 04:15 | Developer | Split change-password / delete-account into own routes | Sensitive ops out of Sessions into dedicated pages |
| Apr 20 04:30 | Developer | Sidebar redesign (Slack-style + lucide icons) | Distinct dark surface; replaced emoji icons with consistent line icons |
| Apr 20 05:10 | Developer | Light/dark theme + CSS-variable sweep (§4.1.2) | `useTheme` with localStorage + prefers-color-scheme; every surface themed |
| Apr 20 05:25 | Developer | API test plan + runner | 67 curl+jq tests covering §2.1–2.7; runs in ~15s |
| Apr 20 06:15 | Developer | Submission prep | README, `099_seed.sql` auto-applied, real bcrypt hash, gitignore hygiene, env vars wired, `SESSION_SECRET` dropped |
| 07:30 | Developer | Unread counter restyle | Accent-purple pill; fixed circle shape; white/accent flip on active row |
| 07:35 | Agent | Text↔Icons toggle on room cards | Prototype so both variants could be compared side-by-side |
| 07:40 | Developer | Committed to icon-only room buttons | Toggle + hook removed; `RoomActionButton` simplified to icon-only |
| 07:45 | Developer | Drop all `console.log` calls | Kept `console.error` in catch blocks for demo triage |
| 07:55 | Agent | Production-readiness audit | Replaced two `alert()` with inline toast; added `restart: unless-stopped`; rejected NODE_ENV flip (breaks HTTP cookie) |
| 08:10 | Agent | Reconnect gap-sync + ProtectedLayout remount fix | `sync`/`sync:delta` protocol; found that in-render ProtectedLayout was unmounting routed tree on every WS state flip |
| 08:25 | Agent | 100K message history perf test | Composite indexes + `tests/perf_history.sh`; SQL <0.1ms, HTTP 4.4–5.2ms |
| 09:15 | Agent | `.dockerignore` for both services | Prevents host `node_modules`/`dist` leaking into images on rebuild |
| 09:25 | Agent | Drop spurious `cp .env.example .env` step | Compose injects env vars inline; the copy was a no-op |
| 09:40 | Developer | README: correct seeded user count 5 → 50 | Seed had been extended to `alice`–`zack`; README still advertised only five |

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
- **Model choice mattered more than I expected**: I spent roughly the first half of the hackathon on Haiku before switching to the larger model. For coding specifically — writing non-trivial features, spotting bugs in existing code, keeping multiple constraints in mind at once — the gap was large. Haiku needed much more hand-holding per feature and produced code that required a second pass; the larger model got closer to final on the first try. For future hackathons I'd default to the stronger model for feature work and only drop to a cheaper tier for narrowly-scoped mechanical tasks.

## Hardest Parts

- **Presence broadcasts to multiple recipients**: Understanding that AFK state changes need to reach *both* friends *and* room members simultaneously required mapping out the broadcast graph. Once I drew it out, the solution (separate `broadcastPresenceToFriends` and `broadcastPresenceToRoomMembers` functions) was obvious, but took 15 min to conceptualize.
- **Ping debouncing without over-engineering**: Tracking `lastAcceptedPing` per tab in the WS connection Map was simple, but thinking through the timing (5s window, per-tab not per-user) and async/await flow took a few tries.
- **The unread message system was the last feature to land**: The spec mentions unread counts but has no endpoint for them. Adding `unread_cursors`-style tracking, a watermark update on open, and a GET endpoint for badges was a deceptively large piece of work because it had to weave into both rooms and DMs and into the WS event stream. It was deprioritized on day 1 and implemented on day 2 after the other §2 gaps were closed (see migration `004_unread_tracking.sql` and Phase 9).
- **Frontend routing discipline**: Making sure the React Router components matched the backend routes (e.g., `/friends` page, `/dm/:userId` page) and that navigation wasn't hardcoded required careful alignment. The agent did this but it required multiple passes through App.jsx.

## If I Did It Again

- **Would validate the spec before coding**: Read the test plan carefully (UT-, IT-, E2E-, LOAD-, SEC- tests) upfront and use that to drive architecture decisions instead of reading it after the fact. This would have avoided surprises like "oh, status codes matter" and "oh, 3072 bytes not 5000 characters".
- **Would sketch the WS event model**: Before writing any broadcast code, draw out which events reach which recipients (presence → friends + rooms, messages → room members, friend requests → target user, etc.). Would have saved time on the circular dependency issue.
- **Would defer Friends/DMs until other features were rock solid**: The require() crash in getDMHistory was caught late because the feature was rushed. Should have implemented Auth → Presence → Rooms → Messaging first, then done Friends/DMs as polish.
- **Would use a single shared session token across curl tests**: Instead of logging in three separate times for three tests, set up a single test user and reuse their session. Would have saved 5 min on setup.
- **Would run the requirements audit earlier**: The section-by-section §2.1–2.7 re-read happened on day 2, which is when I found most of the behavioral gaps (blocked-contact history, DM feature parity with rooms, attachment access checks, unread indicators). Doing that audit after Phase 2 would have seeded the work queue with concrete gaps instead of having to retrofit them late.
- **Would set up the theme variable system on day 1**: The light/dark toggle was added late and forced a sweep through every CSS module to replace hardcoded colors with variables. Introducing `--bg-surface`, `--text`, `--border` etc. at the start would have cost nothing then and saved a few hours of grep-and-replace at the end.
- **Would write tests from requirements before writing features (TDD)**: The section-by-section §2.1–2.7 audit on day 2 caught gaps that end-to-end tests would have caught the moment each feature was implemented. Converting `hackathon-requirements.md` into `tests/run.sh` cases *first* would have turned "does the spec say X works?" into a green/red signal at every step instead of a retrofit pass at the end — and would have caught the attachment access checks, blocked-contact history, and DM feature parity gaps without needing a dedicated audit day.
- **Would spend more time planning before coding**: The features that landed in one pass and the features that required two or three refactor loops differed almost entirely in how clearly I'd thought through the data shape, the error paths, and the UI flow before asking the agent to implement. A 10-minute sketch upfront is cheaper than a 45-minute refactor after. The iterative "double-check against requirements, then refactor" cycle was the single biggest time sink; better planning collapses it to a single pass.
- **Would define UI designs and layouts before implementation**: Two late sweeps unified the visual language and extracted theme variables — that work would have been near-zero cost if wireframes (or at least component-level style tokens: surface, border, input, button, danger) had been decided on day 1. Even low-fidelity sketches for each page, and a short list of reusable components with their intended states, before touching JSX would have prevented the retrofit. For next time I'd allocate an explicit design-phase block before any frontend code.
