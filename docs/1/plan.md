# Plan: Web Based Coup (#1)

## Objective
Build a fully playable, real-time multiplayer web version of *Coup* for 2–6 players. Players create or join private rooms via a 6-character code, play a server-enforced game with text chat, and see all game events in a live action log. The system is server-authoritative over WebSockets with in-memory state and no user accounts.

## Scope

### In Scope
- Project scaffolding: Vite + React + TypeScript frontend, Deno + Hono backend, lint scripts for existing hooks
- Room management: create room, join by code, lobby with real-time player list, host badge, host migration on disconnect
- Full Coup rule engine (server-side): Income, Foreign Aid, Coup, Duke, Assassin, Captain, Ambassador — all with correct challenge and block resolution
- Server-authoritative WebSocket game loop: all state on server, clients receive diffs
- Turn enforcement, challenge/block windows, influence loss, elimination, win detection
- Reconnection: rejoin within session window using stored playerId (localStorage)
- Text chat: in-lobby and in-game chat panel (replaces voice)
- Four screens via client-side state machine: Landing → Lobby → Game → End Game
- Game-themed UI: Tailwind CSS base, MUI components where helpful, dark/dramatic Coup aesthetic
- Deployment: Deno Deploy (backend) + Vercel (frontend)

### Out of Scope
- Voice chat
- User accounts / auth / persistent storage
- Public lobbies, ranked matchmaking, replay, stats, AI bots
- Mobile native app
- Spectators in lobby

## Approach

**Backend (Deno + Hono):**
- HTTP routes via Hono: `POST /rooms` (create), `GET /rooms/:code` (validate before join)
- WebSocket endpoint: `GET /ws/:roomCode/:playerId` — upgrades to a persistent socket per player
- `RoomManager` singleton: `Map<roomCode, RoomState>` — all rooms in memory
- `GameEngine` pure module: takes a `GameState` + `Action` → returns new `GameState` + `[]Event`. No I/O — fully testable with `deno test`
- Message protocol: JSON over WebSocket, typed `ServerMessage` / `ClientMessage` union types shared between backend and frontend (via a `shared/` types package)
- Reconnection: on disconnect, player marked `disconnected` but not removed for 60s; on rejoin with same playerId, socket is reattached

**Frontend (Vite + React + TypeScript):**
- `useAppState` hook: holds `{ screen, roomCode, playerId, playerName, gameState }` — single source of truth
- `App.tsx`: `switch(screen)` renders `<LandingPage>`, `<LobbyPage>`, `<GamePage>`, or `<EndGamePage>`
- `useWebSocket` hook: manages connection, parses incoming `ServerMessage`, dispatches to app state
- Game screen layout matches the ASCII wireframe in the issue: status bar, table area, action log, action panel, personal HUD, text chat panel
- Cards are shown face-down by default; revealed only on loss or Ambassador exchange

**Shared types (`shared/`):**
- `ClientMessage` union (all actions a player can send)
- `ServerMessage` union (all updates the server broadcasts)
- `GameState`, `Player`, `Card`, `Action` types

## Affected Areas

| Area | Files / Modules | Change Type |
|------|----------------|-------------|
| Backend scaffold | `backend/`, `backend/main.ts`, `backend/deno.json`, `backend/scripts/lint.sh` | Add |
| Frontend scaffold | `frontend/`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/scripts/lint.sh` | Add |
| Shared types | `shared/types.ts` | Add |
| Room management | `backend/src/rooms/` | Add |
| Game engine | `backend/src/game/` | Add |
| WebSocket server | `backend/src/ws/` | Add |
| Frontend state machine | `frontend/src/state/` | Add |
| Frontend screens | `frontend/src/screens/` | Add |
| Frontend components | `frontend/src/components/` | Add |

## Assumptions

1. **[ASSUMPTION]** Tech stack: Vite + React 18 + TypeScript for frontend; Deno 2.x + Hono for backend.
2. **[ASSUMPTION]** Shared types live in a `shared/` directory at the repo root, imported by both sides. Deno can import via relative path; Vite via path alias.
3. **[ASSUMPTION]** Text chat messages are ephemeral (in-memory per room, no history on reconnect beyond what the action log shows).
4. **[ASSUMPTION]** Coup card distribution: 3 copies each of Duke, Assassin, Captain, Ambassador, Contessa = 15 cards total (standard deck).
5. **[ASSUMPTION]** Ambassador action: draw 2 cards from deck, keep 2 total (standard rules).
6. **[ASSUMPTION]** The `frontend/scripts/lint.sh` and `backend/scripts/lint.sh` stubs will be created as part of the scaffolding task so existing hooks don't fail on first edit.

## Open Questions (resolved)

| # | Question | Answer |
|---|----------|--------|
| 1 | Voice or text chat? | Text chat |
| 2 | Frontend routing? | Client-side state machine (`useAppState` hook) |
| 3 | Backend framework? | Hono on Deno |
| 4 | Styling? | Tailwind CSS + MUI where needed, game-themed dark aesthetic |
| 5 | Deployment? | Deno Deploy (backend) + Vercel (frontend), both free tier |

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| WebSocket reconnect race condition (two sockets for same player) | Server rejects second connection if first is still alive; replaces on confirmed disconnect |
| Challenge/block timing (who can respond and when) | Server opens a timed window (e.g. 30s) for reactions; all other players must pass or act within it |
| Ambassador card exchange complexity | Isolate in a dedicated `resolveAmbassador` function in GameEngine; cover with unit tests |
| Deno Deploy WebSocket support | Deno Deploy supports `Deno.upgradeWebSocket` natively — no issue |
| Shared types import across two runtimes | Use a single `shared/types.ts`; Vite alias + Deno relative import — straightforward |
