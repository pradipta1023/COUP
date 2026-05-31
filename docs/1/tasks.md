# Tasks: Web Based Coup (#1)

## Task 1: Monorepo Scaffold & Hook Wiring

**Description**
Create the `frontend/`, `backend/`, and `shared/` directory structure. Wire up `scripts/lint.sh` in both `frontend/` and `backend/` so the existing PostToolUse and Stop hooks don't fail. Initialize package manifests (`deno.json`, `package.json`, `vite.config.ts`, `tsconfig.json`, Tailwind config).

**Acceptance Criteria**
- [ ] `frontend/scripts/lint.sh` exists and runs ESLint + tsc on a given file without error
- [ ] `backend/scripts/lint.sh` exists and runs `deno lint` on a given file without error
- [ ] `frontend/` Vite dev server starts (`npm run dev`) and renders a blank React app
- [ ] `backend/` Deno server starts (`deno run`) and responds to `GET /health`
- [ ] Stop-check hook passes clean on an empty codebase

**Files Likely Affected**
- `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`
- `frontend/tailwind.config.ts`, `frontend/src/main.tsx`, `frontend/src/App.tsx`
- `frontend/scripts/lint.sh`
- `backend/deno.json`, `backend/main.ts`
- `backend/scripts/lint.sh`
- `shared/types.ts`

**Test Requirements**
- Unit: none (scaffold only)
- Integration: `deno task start` and `npm run dev` both exit 0

**Dependencies:** None

**Estimated Complexity:** S

---

## Task 2: Shared Types & Message Protocol

**Description**
Define all TypeScript types shared between frontend and backend: `GameState`, `Player`, `Card`, `CardName`, `Action`, `ClientMessage` union, `ServerMessage` union.

**Acceptance Criteria**
- [ ] `shared/types.ts` exports all core domain types with no `any`
- [ ] `ClientMessage` covers all player-initiated actions (join, take-action, challenge, block, pass, chat, reveal-card, ambassador-exchange)
- [ ] `ServerMessage` covers all server broadcasts (room-update, game-started, game-state, action-log, error, chat)
- [ ] Backend imports types via relative path without error
- [ ] Frontend imports types via `@shared` Vite alias without error
- [ ] `deno lint` and `tsc --noEmit` both pass

**Files Likely Affected**
- `shared/types.ts`
- `frontend/vite.config.ts` (add `@shared` alias)
- `backend/deno.json` (add import map for `@shared`)

**Test Requirements**
- Unit: type-level tests (compile-time only)

**Dependencies:** Task 1

**Estimated Complexity:** S

---

## Task 3: Backend Room Manager

**Description**
Implement the `RoomManager` singleton: create rooms, add/remove players, assign host, migrate host on disconnect, destroy empty rooms. Expose via Hono HTTP routes.

**Acceptance Criteria**
- [ ] `POST /rooms` returns `{ roomCode, playerId }` for a new room
- [ ] `GET /rooms/:code` returns 200 with player list if room exists, 404 otherwise
- [ ] Room codes are unique 6-character alphanumeric strings
- [ ] When host disconnects, next connected player becomes host and all clients are notified
- [ ] When last player leaves, room is destroyed
- [ ] `deno test` passes for all room manager unit tests

**Files Likely Affected**
- `backend/src/rooms/RoomManager.ts`
- `backend/src/rooms/Room.ts`
- `backend/main.ts`

**Test Requirements**
- Unit: create/join/leave/host-migration/destroy logic
- Edge cases: joining a full room (6 players), joining a non-existent code

**Dependencies:** Task 2

**Estimated Complexity:** M

---

## Task 4: Coup Game Engine

**Description**
Implement the pure `GameEngine` module: card deck, shuffle/deal, all 7 actions with correct coin costs, challenge resolution, block resolution, influence loss, elimination, and win detection. Pure function — no I/O.

**Acceptance Criteria**
- [ ] `initGame(players)` deals 2 cards and 2 coins to each player, shuffles deck
- [ ] All 7 actions implemented: Income, Foreign Aid, Coup, Duke (Tax), Assassin, Captain (Steal), Ambassador (Swap)
- [ ] Challenge resolution: reveal card → loser loses influence; winner shuffles back and draws replacement
- [ ] Block resolution: block can itself be challenged
- [ ] Coup costs 7 coins; forced Coup at 10+ coins
- [ ] Assassin costs 3 coins
- [ ] Player with 0 influence cards is eliminated
- [ ] Win condition detected when only 1 player remains
- [ ] `deno test` passes for all engine unit tests

**Files Likely Affected**
- `backend/src/game/GameEngine.ts`
- `backend/src/game/Deck.ts`
- `backend/src/game/actions.ts`

**Test Requirements**
- Unit: each action's happy path and coin/card mutations
- Unit: challenge outcomes, block + block-challenge outcomes
- Unit: elimination and win condition
- Edge cases: Coup when target has 1 card, Ambassador with <2 cards in deck, steal from player with 0/1 coins

**Dependencies:** Task 2

**Estimated Complexity:** L

---

## Task 5: WebSocket Server & Game Loop

**Description**
Wire GameEngine and RoomManager together via WebSocket connections. Handle player connections/disconnections, route ClientMessage to engine, broadcast ServerMessage to room. Implement reaction window (challenge/block timer).

**Acceptance Criteria**
- [ ] `GET /ws/:roomCode/:playerId` upgrades to WebSocket
- [ ] Host's `START_GAME` message triggers `initGame` and broadcasts `game-started`
- [ ] Each `take-action` is validated before being applied
- [ ] After blockable/challengeable action, server opens reaction window for all other players
- [ ] Reactions close window; engine resolves and broadcasts updated state
- [ ] On disconnect: player marked disconnected; on reconnect within 60s, state restored
- [ ] `deno test` passes for WebSocket message routing tests

**Files Likely Affected**
- `backend/src/ws/ConnectionManager.ts`
- `backend/src/ws/MessageRouter.ts`
- `backend/src/ws/ReactionWindow.ts`
- `backend/main.ts`

**Test Requirements**
- Unit: message routing, reaction window timeout
- Edge cases: action on wrong turn, disconnect during reaction window

**Dependencies:** Tasks 3 & 4

**Estimated Complexity:** M

---

## Task 6: Frontend State Machine & WebSocket Client

**Description**
Implement `useAppState` hook (screen state machine) and `useWebSocket` hook (connection + message dispatch).

**Acceptance Criteria**
- [ ] `useAppState` holds `{ screen, roomCode, playerId, playerName, gameState, chatMessages }`
- [ ] Screen transitions: LANDING → LOBBY → GAME → END_GAME → LANDING
- [ ] `useWebSocket` connects, parses all `ServerMessage` types, calls state updaters
- [ ] On reconnect, `playerId` read from `localStorage` and sent on connect
- [ ] WS errors/disconnects surface a visible status indicator
- [ ] `tsc --noEmit` + ESLint pass

**Files Likely Affected**
- `frontend/src/state/useAppState.ts`
- `frontend/src/state/useWebSocket.ts`

**Test Requirements**
- Unit: state transitions via mock WS messages
- Edge cases: reconnect with stale playerId, WS failure on landing

**Dependencies:** Tasks 1 & 2

**Estimated Complexity:** M

---

## Task 7: Landing Page & Lobby Screen

**Description**
Implement Landing page (create/join forms) and Lobby screen (player list, room code, host controls, chat). Game-themed dark UI.

**Acceptance Criteria**
- [ ] Landing: Create Game → POST /rooms → store playerId → transition to Lobby
- [ ] Landing: Join Game form validates room code, connects WS, transitions to Lobby
- [ ] Lobby: room code display, player list with host badge, connected/disconnected status
- [ ] Lobby: Start Game button host-only, disabled when <2 players
- [ ] Lobby: real-time updates when players join/leave
- [ ] Lobby: text chat panel functional
- [ ] Dark game-themed aesthetic

**Files Likely Affected**
- `frontend/src/screens/LandingPage.tsx`
- `frontend/src/screens/LobbyPage.tsx`
- `frontend/src/components/PlayerList.tsx`
- `frontend/src/components/ChatPanel.tsx`
- `frontend/src/components/RoomCode.tsx`

**Test Requirements**
- Unit: form validation (empty name, invalid code)
- Edge cases: joining full room, non-existent code

**Dependencies:** Task 6

**Estimated Complexity:** M

---

## Task 8: Game Screen

**Description**
Implement the full Game screen: status bar, player table, action log, action panel, personal HUD, chat. Driven by live gameState.

**Acceptance Criteria**
- [ ] Status bar: room code, host, player count, whose turn, connection status
- [ ] Table: all players with coin count + influence count (face-down), active player highlighted
- [ ] Action panel: legal actions only for current player on their turn
- [ ] Mandatory Coup enforced at 10+ coins
- [ ] Reaction modal (challenge/block/pass) appears during open windows
- [ ] Personal HUD: your cards (face-down), coins, current status
- [ ] Action log: live event feed, colour-coded, newest on top
- [ ] Eliminated players greyed out
- [ ] `tsc --noEmit` + ESLint pass

**Files Likely Affected**
- `frontend/src/screens/GamePage.tsx`
- `frontend/src/components/StatusBar.tsx`
- `frontend/src/components/PlayerTable.tsx`
- `frontend/src/components/ActionPanel.tsx`
- `frontend/src/components/ReactionModal.tsx`
- `frontend/src/components/PersonalHUD.tsx`
- `frontend/src/components/ActionLog.tsx`

**Test Requirements**
- Unit: `getAvailableActions(gameState, playerId)` returns correct set
- Edge cases: 10-coin forced Coup, reaction window with 1 other player

**Dependencies:** Tasks 6 & 7

**Estimated Complexity:** L

---

## Task 9: End Game Screen & Full Integration Smoke Test

**Description**
Implement End Game screen (winner display, play-again). Run full local integration smoke test.

**Acceptance Criteria**
- [ ] End Game screen displays winner name and Play Again button
- [ ] Play Again resets state and returns to Landing
- [ ] Two-player game completes without server error
- [ ] All `deno test` pass
- [ ] Frontend ESLint + `tsc --noEmit` pass
- [ ] Stop-check hook passes clean

**Files Likely Affected**
- `frontend/src/screens/EndGamePage.tsx`

**Test Requirements**
- Integration: manual two-tab smoke test

**Dependencies:** Task 8

**Estimated Complexity:** S
