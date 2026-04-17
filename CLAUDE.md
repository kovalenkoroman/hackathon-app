# Project Overview

This is a production-ready web application built during a hackathon. The goal is to minimize hand-written code and maximize output via AI agent prompting.

## Tech Stack

- **Backend**: Node.js (Express)
- **Frontend**: Plain HTML/JS or React (agent's choice based on complexity)
- **Database**: PostgreSQL
- **Real-time**: WebSockets (via `ws` library on Node)
- **Containerization**: Docker + Docker Compose

## Project Structure

```
/
├── backend/
│   ├── src/
│   │   ├── routes/        # REST API route handlers
│   │   ├── services/      # Business logic
│   │   ├── models/        # DB models / query functions
│   │   ├── ws/            # WebSocket handlers
│   │   └── index.js       # Entry point
│   ├── migrations/        # SQL migration files (numbered: 001_init.sql)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ws.js          # WebSocket client wrapper
│   ├── public/
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── requirements.md        # Feature requirements (update as task is revealed)
├── implementation.md      # Implementation plan derived from requirements
└── notes.md               # Running log of decisions, what worked, what didn't
```

## Conventions

### API
- REST endpoints follow `/api/v1/<resource>` pattern
- Always return JSON: `{ data: ..., error: null }` or `{ data: null, error: "message" }`
- HTTP 200 for success, 400 for validation errors, 500 for server errors

### Database
- Use snake_case for all table and column names
- Every table has: `id SERIAL PRIMARY KEY`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- Migrations are plain SQL files in `/backend/migrations/`, numbered sequentially
- Never use an ORM — use raw parameterized queries via `pg` (Node) or `asyncpg`/`psycopg2` (Python)

### WebSockets
- Server listens on `/ws` path
- Messages are JSON: `{ type: "event_name", payload: { ... } }`
- Client reconnects automatically on disconnect (see ws.js skill)

### Environment
- All config via environment variables, never hardcoded
- `.env.example` lists all required vars with placeholder values
- Docker Compose reads from `.env` file

## How to Run

```bash
cp .env.example .env
docker compose up --build
```

App available at `http://localhost:3000`
API at `http://localhost:3000/api/v1`
WebSocket at `ws://localhost:3000/ws`

## Code Style

- No TypeScript (keep it simple for speed)
- Async/await everywhere, no callbacks
- Functions should do one thing
- Comment non-obvious logic only
- No external UI component libraries — plain CSS or Tailwind CDN

## Agent Instructions

When I ask you to implement a feature:
1. Read `requirements.md` and `implementation.md` first
2. Check existing code before creating new files
3. Follow the structure and conventions above exactly
4. After implementing, run a quick sanity check with Playwright MCP to verify it works
5. Update `implementation.md` to mark the feature as done
