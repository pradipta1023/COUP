/**
 * Pure reducer unit tests — run with: npx tsx src/state/reducer.test.ts
 * No React or DOM required.
 */
import { initialState } from './types'
import { reducer, serverMessageToAction } from './reducer'
import type { ClientGameState, RoomState, ServerMessage } from '@shared/types'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
  console.log(`PASS: ${msg}`)
}

const dummyRoomState: RoomState = {
  roomCode: 'ABC123',
  players: [],
  hostPlayerId: 'p1',
  status: 'lobby',
}

const dummyGameState: ClientGameState = {
  players: [],
  turnState: { currentPlayerId: 'p1', phase: 'waiting_for_action', passedPlayerIds: [] },
  actionLog: [],
}

// ENTER_LOBBY transitions screen to LOBBY
{
  const s = reducer(initialState, { type: 'ENTER_LOBBY', roomCode: 'ABC', playerId: 'p1', playerName: 'Alice' })
  assert(s.screen === 'LOBBY', 'ENTER_LOBBY → screen is LOBBY')
  assert(s.roomCode === 'ABC', 'ENTER_LOBBY → roomCode stored')
  assert(s.playerId === 'p1', 'ENTER_LOBBY → playerId stored')
}

// ROOM_UPDATE stores roomState without changing screen
{
  const lobby = reducer(initialState, { type: 'ENTER_LOBBY', roomCode: 'ABC', playerId: 'p1', playerName: 'Alice' })
  const s = reducer(lobby, { type: 'ROOM_UPDATE', roomState: dummyRoomState })
  assert(s.screen === 'LOBBY', 'ROOM_UPDATE keeps screen')
  assert(s.roomState?.roomCode === 'ABC123', 'ROOM_UPDATE stores roomState')
}

// GAME_STARTED transitions to GAME
{
  const lobby = reducer(initialState, { type: 'ENTER_LOBBY', roomCode: 'ABC', playerId: 'p1', playerName: 'Alice' })
  const s = reducer(lobby, { type: 'GAME_STARTED', gameState: dummyGameState })
  assert(s.screen === 'GAME', 'GAME_STARTED → screen is GAME')
  assert(s.gameState !== null, 'GAME_STARTED → gameState set')
}

// GAME_OVER transitions to END_GAME
{
  const game = reducer(initialState, { type: 'GAME_STARTED', gameState: dummyGameState })
  const s = reducer(game, { type: 'GAME_OVER', winnerId: 'p1', winnerName: 'Alice' })
  assert(s.screen === 'END_GAME', 'GAME_OVER → screen is END_GAME')
  assert(s.gameState?.winnerName === 'Alice', 'GAME_OVER → winnerName set')
}

// RESET returns to LANDING
{
  const game = reducer(initialState, { type: 'GAME_STARTED', gameState: dummyGameState })
  const s = reducer(game, { type: 'RESET' })
  assert(s.screen === 'LANDING', 'RESET → screen is LANDING')
  assert(s.gameState === null, 'RESET → gameState cleared')
}

// CHAT_MESSAGE appends to chatMessages
{
  const s = reducer(initialState, {
    type: 'CHAT_MESSAGE',
    msg: { playerId: 'p1', playerName: 'Alice', message: 'hi', timestamp: 0 },
  })
  assert(s.chatMessages.length === 1, 'CHAT_MESSAGE → appended')
  assert(s.chatMessages[0].message === 'hi', 'CHAT_MESSAGE → correct message')
}

// serverMessageToAction maps correctly
{
  const msg: ServerMessage = { type: 'room_update', room: dummyRoomState }
  const action = serverMessageToAction(msg)
  assert(action?.type === 'ROOM_UPDATE', 'room_update → ROOM_UPDATE action')
}

{
  const msg: ServerMessage = { type: 'game_started', gameState: dummyGameState }
  const action = serverMessageToAction(msg)
  assert(action?.type === 'GAME_STARTED', 'game_started → GAME_STARTED action')
}

{
  const msg: ServerMessage = { type: 'game_over', winnerId: 'p1', winnerName: 'Alice' }
  const action = serverMessageToAction(msg)
  assert(action?.type === 'GAME_OVER', 'game_over → GAME_OVER action')
}

{
  // Stale playerId: ENTER_LOBBY with an id, then reset → playerId cleared
  const s1 = reducer(initialState, { type: 'ENTER_LOBBY', roomCode: 'X', playerId: 'stale-id', playerName: 'Bob' })
  const s2 = reducer(s1, { type: 'RESET' })
  assert(s2.playerId === null, 'RESET clears stale playerId')
  assert(s2.roomCode === null, 'RESET clears roomCode')
}

{
  // WS error → SET_WS_STATUS
  const s = reducer(initialState, { type: 'SET_WS_STATUS', status: 'error' })
  assert(s.wsStatus === 'error', 'SET_WS_STATUS → wsStatus updated')
  assert(s.screen === 'LANDING', 'SET_WS_STATUS does not change screen')
}

console.log('\nAll reducer tests passed.')
