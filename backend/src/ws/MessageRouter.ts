import type { ClientMessage } from '@shared/types.ts';
import {
  applyBlock,
  applyChallenge,
  applyExchange,
  applyPass,
  applyReveal,
  declareAction,
  initGame,
  toClientGameState,
} from '../game/GameEngine.ts';
import type { Room } from '../rooms/Room.ts';
import { ReactionWindow } from './ReactionWindow.ts';

const reactionWindows: Map<string, ReactionWindow> = new Map();

function getWindow(roomCode: string): ReactionWindow {
  if (!reactionWindows.has(roomCode)) {
    reactionWindows.set(roomCode, new ReactionWindow());
  }
  return reactionWindows.get(roomCode)!;
}

function clearWindow(roomCode: string): void {
  reactionWindows.get(roomCode)?.clear();
}

function startReactionWindow(room: Room): void {
  const win = getWindow(room.code);
  win.start(() => {
    // Timeout: auto-pass for all players who haven't responded
    if (!room.gameState) return;
    const ts = room.gameState.turnState;
    const phase = ts.phase;
    if (phase !== 'waiting_for_reactions' && phase !== 'waiting_for_block_challenge') return;

    const others = room.gameState.players.filter(
      (p) => !p.isEliminated && p.id !== ts.currentPlayerId && !ts.passedPlayerIds.includes(p.id),
    );

    let state = room.gameState;
    for (const p of others) {
      try {
        const result = applyPass(state, p.id);
        state = result.state;
        if (result.actionResolved) break;
      } catch {
        // player may have been eliminated mid-loop
      }
    }
    room.gameState = state;
    room.broadcastGameState();
  });
}

export function routeMessage(room: Room, playerId: string, raw: string): void {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw) as ClientMessage;
  } catch {
    room.send(playerId, { type: 'error', message: 'Invalid JSON' });
    return;
  }

  try {
    switch (msg.type) {
      case 'start_game':
        handleStartGame(room, playerId);
        break;
      case 'take_action':
        handleTakeAction(room, playerId, msg.action, msg.targetPlayerId);
        break;
      case 'challenge':
        handleChallenge(room, playerId);
        break;
      case 'block':
        handleBlock(room, playerId, msg.role);
        break;
      case 'pass':
        handlePass(room, playerId);
        break;
      case 'reveal_card':
        handleReveal(room, playerId, msg.cardIndex);
        break;
      case 'exchange_cards':
        handleExchange(room, playerId, msg.keepIndices);
        break;
      case 'chat':
        handleChat(room, playerId, msg.message);
        break;
      case 'join':
        // join is handled at HTTP level before WS upgrade
        break;
      default:
        room.send(playerId, { type: 'error', message: 'Unknown message type' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    room.send(playerId, { type: 'error', message });
  }
}

function handleStartGame(room: Room, playerId: string): void {
  if (room.hostPlayerId !== playerId) throw new Error('Only the host can start the game');
  if (room.inGame) throw new Error('Game already started');
  if (room.playerCount < 2) throw new Error('Need at least 2 players');

  const seeds = room.getPlayers().map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.id === room.hostPlayerId,
  }));

  room.gameState = initGame(seeds);
  room.inGame = true;
  room.broadcastGameState('game_started');
}

function handleTakeAction(
  room: Room,
  playerId: string,
  action: ClientMessage & { type: 'take_action' } extends { action: infer A } ? A : never,
  targetPlayerId?: string,
): void {
  if (!room.gameState) throw new Error('Game not started');
  const { state, needsReaction } = declareAction(room.gameState, playerId, action, targetPlayerId);
  room.gameState = state;
  room.broadcastGameState();
  if (needsReaction) startReactionWindow(room);
}

function handleChallenge(room: Room, playerId: string): void {
  if (!room.gameState) throw new Error('Game not started');
  clearWindow(room.code);
  const { state } = applyChallenge(room.gameState, playerId);
  room.gameState = state;
  room.broadcastGameState();
}

function handleBlock(
  room: Room,
  playerId: string,
  role: ClientMessage & { type: 'block' } extends { role: infer R } ? R : never,
): void {
  if (!room.gameState) throw new Error('Game not started');
  clearWindow(room.code);
  const { state } = applyBlock(room.gameState, playerId, role);
  room.gameState = state;
  room.broadcastGameState();
  startReactionWindow(room);
}

function handlePass(room: Room, playerId: string): void {
  if (!room.gameState) throw new Error('Game not started');
  const { state, actionResolved } = applyPass(room.gameState, playerId);
  room.gameState = state;
  if (actionResolved) clearWindow(room.code);
  room.broadcastGameState();
}

function handleReveal(room: Room, playerId: string, cardIndex: number): void {
  if (!room.gameState) throw new Error('Game not started');
  const { state } = applyReveal(room.gameState, playerId, cardIndex);
  room.gameState = state;
  if (state.winnerId) {
    room.broadcast({ type: 'game_over', winnerId: state.winnerId, winnerName: state.winnerName });
  }
  room.broadcastGameState();
}

function handleExchange(
  room: Room,
  playerId: string,
  keepIndices: [number, number],
): void {
  if (!room.gameState) throw new Error('Game not started');
  const { state } = applyExchange(room.gameState, playerId, keepIndices);
  room.gameState = state;
  room.broadcastGameState();
}

function handleChat(room: Room, playerId: string, message: string): void {
  const player = room.getPlayer(playerId);
  if (!player) return;
  const trimmed = message.trim().slice(0, 500);
  if (!trimmed) return;
  room.broadcast({
    type: 'chat',
    playerId,
    playerName: player.name,
    message: trimmed,
    timestamp: Date.now(),
  });
}

export function sendCurrentState(room: Room, playerId: string): void {
  if (room.gameState) {
    const clientState = toClientGameState(room.gameState, playerId);
    room.send(playerId, { type: 'game_state', gameState: clientState });
  } else {
    room.send(playerId, { type: 'room_update', room: room.toRoomState() });
  }
}
