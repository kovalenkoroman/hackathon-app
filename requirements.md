# Requirements

> Fill this in once the task is announced at the kickoff call tomorrow.
> Then ask Claude Code: "Read this file and generate implementation.md with a step-by-step plan."

## Functional Requirements

<!-- List features here as bullet points after the task is revealed -->

- [ ] FR-1: ...
- [ ] FR-2: ...
- [ ] FR-3: ...

## Non-Functional Requirements

- App must start with `docker compose up`
- PostgreSQL as database
- WebSocket for real-time features
- No auth required (unless task specifies)
- Reasonable error handling (no unhandled crashes)

## Out of Scope

- Deployment to cloud
- Mobile responsiveness (nice to have, not required)
- Authentication (unless required)

---

# Implementation Plan

> Have Claude Code generate this section from the requirements above.
> Prompt: "Based on requirements.md, write a detailed implementation plan in implementation.md. 
>  Break it into phases. Each phase should have clear tasks I can tick off."

## Phase 1: Foundation
- [ ] Initialize project structure per CLAUDE.md
- [ ] Set up docker-compose.yml with app + postgres
- [ ] Create DB migration 001_init.sql with base schema
- [ ] Verify `docker compose up` works end to end

## Phase 2: Core Features
- [ ] Implement [feature 1]
- [ ] Implement [feature 2]
- [ ] Add WebSocket support

## Phase 3: Non-trivial Logic
- [ ] Implement [the interesting part]

## Phase 4: Polish
- [ ] Error handling
- [ ] Basic UI
- [ ] Final docker compose test
