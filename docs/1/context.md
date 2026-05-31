# Context Summary: Issue #1 — Web Based Coup

## Issue
- **State:** open
- **Labels:** none
- **Milestone:** none

## What the issue asks for
Build a real-time web-based multiplayer version of the board game *Coup* for 2–6 players. Players join private rooms via room codes, play in a fully rule-enforced match (server-authoritative), and communicate via live voice chat. The system handles the complete game lifecycle: lobby, game start, turn-based gameplay with challenges/blocks/eliminations, and end game. No user accounts — session-based identity only.

## Linked issues
None.

## Images
None attached.

## Codebase findings

| Area | Detail |
|---|---|
| Repo structure | Greenfield — no application code exists yet. Only `.claude/` skills framework and `CLAUDE.md`. |
| Relevant files | None — everything must be built from scratch. |
| Test framework | Not yet established. The stop-check hook expects `frontend/` (ESLint + TypeScript + `npm test`) and `backend/` (Deno + `deno lint` / `deno test`). |
| Tech stack | Implied by hooks: **React/TypeScript** frontend, **Deno** backend. Stack must be confirmed — hooks reference `frontend/scripts/lint.sh` and `backend/scripts/lint.sh`. |
| Relevant docs | `CLAUDE.md` — describes this skills framework only, not the game. |

## Initial observations

- This is an **epic**, not a single story. It covers: entry/lobby UI, room management, full Coup rule engine, real-time WebSocket sync, voice chat (WebRTC or server-relayed), and reconnection. It will need to be broken into multiple implementation tasks.
- The existing stop-check hook assumes `frontend/` and `backend/` directories with their own `scripts/lint.sh` files. These scaffolds don't exist yet and will need to be created.
- **Voice chat** (WebRTC/SFU) is architecturally significant and risky — it should be a separate task, potentially deferred to a later phase after core gameplay works.
- The issue includes a detailed ASCII wireframe of the game screen UI, which provides good fidelity for the frontend layout.
- The backend architecture must be **server-authoritative** (all game state lives on the server, clients receive updates via WebSocket). The Deno ecosystem fits this well (Deno's built-in WebSocket API or a library like `oak`).
- No persistent storage required for MVP — all state is in-memory per room.
