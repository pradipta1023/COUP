import type {
  ClientMessage,
  ServerMessage,
  ClientGameState,
  TurnState,
} from '@shared/types.ts';

Deno.test('ClientMessage union covers all expected types', () => {
  const join: ClientMessage = { type: 'join', roomCode: 'ABC123', playerName: 'Alice' };
  const start: ClientMessage = { type: 'start_game' };
  const action: ClientMessage = { type: 'take_action', action: 'income' };
  const challenge: ClientMessage = { type: 'challenge' };
  const block: ClientMessage = { type: 'block', role: 'Duke' };
  const pass: ClientMessage = { type: 'pass' };
  const reveal: ClientMessage = { type: 'reveal_card', cardIndex: 0 };
  const exchange: ClientMessage = { type: 'exchange_cards', keepIndices: [0, 1] };
  const chat: ClientMessage = { type: 'chat', message: 'hello' };

  const _all = [join, start, action, challenge, block, pass, reveal, exchange, chat];
});

Deno.test('ServerMessage union covers all expected types', () => {
  const turnState: TurnState = { currentPlayerId: 'p1', phase: 'waiting_for_action', passedPlayerIds: [] };
  const gameState: ClientGameState = { players: [], turnState, actionLog: [] };

  const roomUpdate: ServerMessage = { type: 'room_update', room: { roomCode: 'ABC123', players: [], hostPlayerId: 'p1', status: 'lobby' } };
  const gameStarted: ServerMessage = { type: 'game_started', gameState };
  const gameStateMsg: ServerMessage = { type: 'game_state', gameState };
  const logEntry: ServerMessage = { type: 'action_log', entry: { id: '1', timestamp: 0, message: 'test', type: 'action' } };
  const error: ServerMessage = { type: 'error', message: 'oops' };
  const chatMsg: ServerMessage = { type: 'chat', playerId: 'p1', playerName: 'Alice', message: 'hi', timestamp: 0 };
  const gameOver: ServerMessage = { type: 'game_over', winnerId: 'p1', winnerName: 'Alice' };

  const _all = [roomUpdate, gameStarted, gameStateMsg, logEntry, error, chatMsg, gameOver];
});
