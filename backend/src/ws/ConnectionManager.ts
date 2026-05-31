import type { Context } from 'hono';
import { roomManager } from '../rooms/RoomManager.ts';
import { routeMessage, sendCurrentState } from './MessageRouter.ts';

const RECONNECT_WINDOW_MS = 60_000;

export function handleWsUpgrade(c: Context): Response {
  const roomCode = c.req.param('roomCode').toUpperCase();
  const playerId = c.req.param('playerId');

  const room = roomManager.getRoom(roomCode);
  if (!room) {
    return c.text('Room not found', 404);
  }
  if (!room.hasPlayer(playerId)) {
    return c.text('Player not in room', 403);
  }

  const { socket, response } = Deno.upgradeWebSocket(c.req.raw);

  socket.onopen = () => {
    // Cancel any pending reconnect timer
    const timer = room.reconnectTimers.get(playerId);
    if (timer !== undefined) {
      clearTimeout(timer);
      room.reconnectTimers.delete(playerId);
    }

    room.setConnected(playerId, true, socket);

    // Send current state (lobby or game) to this player
    sendCurrentState(room, playerId);

    // Notify others of updated presence
    if (!room.gameState) {
      room.broadcast({ type: 'room_update', room: room.toRoomState() });
    }
  };

  socket.onmessage = (event) => {
    routeMessage(room, playerId, event.data as string);
  };

  socket.onclose = () => {
    room.setConnected(playerId, false, null);

    if (room.gameState) {
      // In-game disconnect: hold the slot for reconnect window
      room.broadcastGameState();
      const timer = setTimeout(() => {
        room.reconnectTimers.delete(playerId);
        // If game is over or room empty, leave; otherwise keep slot
      }, RECONNECT_WINDOW_MS);
      room.reconnectTimers.set(playerId, timer);
    } else {
      // Lobby disconnect: remove player
      roomManager.leaveRoom(roomCode, playerId);
      if (roomManager.getRoom(roomCode)) {
        room.broadcast({ type: 'room_update', room: room.toRoomState() });
      }
    }
  };

  socket.onerror = () => {
    room.setConnected(playerId, false, null);
  };

  return response;
}
