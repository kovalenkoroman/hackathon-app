# Hackathon Notes — Online Chat Server

> Keep this updated as you go. Organizers love this and almost no one does it.
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

- **Pre-hackathon scaffolding**: CLAUDE.md + DB schema + API conventions pre-written; the agent matched the patterns immediately.
- **Migrations-first**: numbered SQL files kept schema changes reversible and documented.
- **Tight feedback loops**: end-to-end browser check after each feature caught circular deps and route-ordering bugs early.
- **No ORM**: raw parameterised `pg` queries stayed readable and made N+1 problems visible.
- **Shared WS broadcast helpers**: `broadcastToRoom` / `ToUser` / `ToFriends` were reused consistently across presence, rooms, and messages.
- **Early error-code discipline**: mapping every auth failure to 403 upfront saved debugging later.

## What Didn't Work / Wasted Time

Framed as what *I* got wrong as the person driving the agent, not what the agent itself did.

- **Underpowered model for the first half**: I ran a lot of features through Haiku before switching. Every feature took more prompts, more corrections, and frequently a second pass to fix subtle misses. Picking the strongest model on day 1 and downgrading only for narrow mechanical tasks would have recovered hours.
- **Prose requirements instead of executable tests**: I described features to the agent in prose, the agent implemented to the prose, and behavioural gaps only surfaced when I re-read `hackathon-requirements.md` on day 2 myself. Converting §2.1–2.7 into `tests/run.sh` *before* any feature prompts would have turned every gap into a red test instead of an audit finding.
- **Under-planning before prompting**: repeatedly I said "implement X" before nailing down the data shape, error paths, and UI flow. The agent implemented something reasonable, I re-read, said "actually no", refactor. That check-then-refactor loop was the single biggest time sink — ten minutes of planning consistently saved forty-five minutes of rework.
- **Letting the agent invent the visual language**: no wireframes, no token list, no component brief — each page's look was improvised as the agent wrote it. A late sweep unified everything, but it would have been near-zero cost with even low-fidelity sketches and a short style-token list agreed on day 1.
- **Over-trusting "done"**: when the agent reported a feature complete I often moved on without cross-checking against the requirements doc. Gaps (attachment access checks, blocked-contact history visibility, DM feature parity) accumulated silently until the day-2 audit. A two-minute "does this match §2.X?" self-check per feature would have kept the backlog honest.

## Observations on Agentic Development

Framed as what I noticed from driving the agent, not about the agent itself.

- **Welcomed clarifying questions instead of pushing through them**: when the agent paused between phases and asked "what next?" I treated that as a feature. A thirty-second answer consistently beat ten minutes of undoing an assumption-driven diversion.
- **Wrote the rules down where the agent could read them**: CLAUDE.md + skill files were the only reliable way to keep conventions sticky across long sessions. Saying "by the way, use raw `pg`" in chat held for one prompt; codified in CLAUDE.md it held across twenty.
- **Traded formal tests for live browser verification during feature work**: rather than ask for Jest/Playwright suites per feature I had the agent run each feature in the browser via Playwright MCP right after implementing. For a hackathon this bought most of the test value at a fraction of the cost. (An end-of-day API regression suite came later, once features had stabilised.)
- **Steered the agent away from defensive coding**: the default is belt-and-braces try/catch around every call. Saying "throw, don't check — we validate at the boundary" once, early, stuck for the rest of the project and left error messages pointing at real problems instead of being swallowed.
- **Fed scope deliberately, not by dumping the whole spec**: pasting the full requirements doc made the agent sprawl; handing it a ranked shortlist of four or five current priorities made it focus. Scope management is a prompt-design choice, not a post-hoc cleanup.
- **Delegated but verified**: when the agent reported "done" I formed the habit of reading the diff before saying yes. The agent's summary describes what it *intended* to do; the diff shows what it *did* — not always the same, often enough to matter.
- **Model choice was the highest-leverage decision**: first half on Haiku needed far more hand-holding per feature; the stronger model produced closer-to-final code on first pass. Default to the strongest model for feature work; only drop to a cheaper tier for narrow mechanical tasks.
- **Frequent commits as a safety net**: committing every 15–30 minutes made it cheap to say "that refactor was wrong, `git reset` and rethink" without losing adjacent work. Agents take bigger swings when the undo button is cheap, and that's usually a net positive.

## Hardest Parts

- **Multi-recipient presence broadcasts**: realising AFK changes must reach *both* friends and room members needed a drawn-out broadcast graph before the two-helper solution became obvious.
- **Ping debounce timing**: per-tab `lastAcceptedPing` with a 5 s window took a few iterations to get right.
- **Unread system landed late**: watermark + endpoint + WS event touched rooms, DMs, and the sidebar; deferred to day 2.
- **Frontend/backend route alignment**: keeping React Router paths, nav links, and backend routes consistent required multiple passes through `App.jsx`.

## If I Did It Again

- **Validate the spec before coding**: read the full test plan upfront so status codes, byte limits, etc. drive architecture from day 1.
- **Sketch the WS event model first**: which events reach which recipients (presence → friends + rooms, etc.) — would have prevented the circular dep.
- **Defer Friends/DMs until core is rock-solid**: Auth → Presence → Rooms → Messaging, *then* Friends/DMs; the rushed DM implementation hid a `require()` crash.
- **Share one session across curl tests**: instead of logging in per test.
- **Run the §2 requirements audit after Phase 2**, not on day 2 — would have seeded gaps (blocked-contact history, DM parity, attachment checks, unreads) as concrete tasks from the start.
- **Set up theme variables on day 1**: avoids the end-of-project hardcoded-colour sweep.
- **TDD from the spec**: convert `hackathon-requirements.md` into `tests/run.sh` cases *before* implementing — every gap becomes a red test instead of an audit finding.
- **Plan before coding**: the iterative "check-requirements-then-refactor" cycle was the biggest time sink. Ten minutes of sketching saved forty-five minutes of rework, consistently.
- **Define UI designs and style tokens up front**: wireframes + a short token list (surface/border/input/button/danger) on day 1 would have made both late theming sweeps unnecessary.
