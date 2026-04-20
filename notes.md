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

## What Worked Well

- **Pre-hackathon scaffolding** — CLAUDE.md + DB schema + API conventions pre-written; the agent matched the patterns immediately.
- **Migrations-first** — numbered SQL files kept schema changes reversible and documented.
- **Tight feedback loops** — end-to-end browser check after each feature caught bugs early.
- **No ORM** — raw `pg` queries stayed readable and made N+1 problems visible.
- **Shared WS broadcast helpers** — `broadcastToRoom` / `ToUser` / `ToFriends` reused across presence, rooms, and messages.
- **Early error-code discipline** — every auth failure mapped to 403 upfront, which saved debugging later.

## What Didn't Work / Wasted Time

What *I* got wrong as the agent's operator, not what the agent did.

- **Ran the first half on the weaker model** — every feature cost more prompts and often a second pass.
- **Wrote requirements to the agent as prose, not as tests** — behavioural gaps only surfaced when I re-read `hackathon-requirements.md` on day 2.
- **Prompted before thinking** — "implement X" before nailing data shape / error paths / UI flow triggered a check-then-refactor cycle every time.
- **Let the agent invent the visual language** — no wireframes or design tokens on day 1, so the app needed a late theming sweep.
- **Accepted "done" without cross-checking the spec** — silent gaps (attachment access, blocked-contact history, DM parity) accumulated until the audit day.

## Observations on Agentic Development

What I noticed from driving the agent — patterns that worked.

- **Welcomed clarifying questions** — a thirty-second answer beat ten minutes of undoing a wrong assumption.
- **Project rules only stuck when codified** — anything in CLAUDE.md or skill files held across the whole project; anything said in chat dissolved within a session or two.
- **Live browser verification beat formal tests during feature work** — Playwright MCP right after each implementation gave most of the test value at a fraction of the cost. (An API regression suite came later, once features stabilised.)
- **Had to steer the agent off defensive coding** — its default is try/catch around everything; saying "throw, don't check — validate at the boundary" once, early, stuck for the whole project.
- **Fed scope deliberately** — pasting the full spec made the agent sprawl; a ranked shortlist of 4–5 current priorities made it focus.
- **Delegated but verified** — the agent's summary describes what it *intended*; the diff shows what it *did*. Read the diff before saying yes.

## Hardest Parts

First time building a full application end-to-end with an agentic workflow. The hard parts weren't technical — they were about the collaboration itself.

- **Calibrating trust vs verify** — read every diff (slow) or trust (risk). Getting the right setting per change type — trust scaffolding, read business logic — took most of day one to settle.
- **Debugging code I didn't write** — normal debugging starts from "I know what I intended"; agent-produced bugs start from "first I need to understand this code". Several hours burned patching symptoms before I learned to read first.
- **Staying two steps ahead, not reactive** — agent speed tempts constant next-prompting, but output quality depends on me having data shape / error paths / UI flow sketched first. Every slip into reactive mode produced a refactor cycle.
- **Scope discipline when everything feels cheap** — "ten more minutes for X" looks true for everything, which makes cuts hard. I added features that should have been cut on day one.
- **Full-stack with an agent is a different skill from task-level help** — chunking, zoom-in moments, handoff decisions, tracking in-flight vs shipped — none of those were muscles I had. Most of the "wasted time" bullets are surface symptoms of this underlying inexperience.

## If I Did It Again

Obvious-in-retrospect lessons from running an agentic workflow at full-project scale for the first time — framed as how I'd drive the agent next time.

- **Start on the strongest model, always** — single highest-leverage decision. Downgrade only for narrow mechanical work.
- **Hand the agent a ranked backlog on day one** — reactive prompting is a failure mode of this workflow. A ranked list lets the agent execute phase by phase and ask smart clarifying questions.
- **TDD from the spec** — convert requirements into `tests/run.sh` before writing features. Every gap becomes a red test instead of an audit finding.
- **Plan ten minutes before every non-trivial prompt** — data shape, error paths, UI flow, sketched first. Ten minutes up front consistently saved forty-five of refactor.
- **Define UI wireframes and style tokens before any JSX** — a token list (surface / border / input / button / danger) plus low-fidelity sketches on day one.
- **Use planning subagents (Plan, Explore) upfront, not as a last resort** — upfront architectural passes would have surfaced the ProtectedLayout remount bug and the gap-sync requirement before they became end-of-project work.
- **Commit every 15–30 minutes as explicit strategy** — makes agent mistakes cheap to reverse and lets the agent take bigger swings safely.

---

## Decisions Log

Chronological one-liner per task / decision. Kept at the end so the retrospective reads first; this is a reference appendix.

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
| 10:41 | Developer | Fix Safari login by dropping nginx `proxy_cookie_flags secure` | Nginx was re-adding `Secure` to `sessionToken` over HTTP; Chrome/Firefox accept on localhost, Safari rejects — cookie never stored |
