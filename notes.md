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

---

## What Worked Well

-

## What Didn't Work / Wasted Time

-

## Observations on Agentic Development

> This is what the organizers actually care about. Be honest.

-

## Hardest Parts

-

## If I Did It Again

-
