import { roomManager } from '../rooms/RoomManager.ts';
import { routeMessage, sendCurrentState } from './MessageRouter.ts';

const RECONNECT_WINDOW_MS = 60_000;

/**
 * Handle a WebSocket upgrade request directly (bypassing Hono middleware).
 * URL pattern: /ws/:roomCode/:playerId
 */
export function handleWsRequest(req: Request): Response {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const roomCode = parts[1]?.toUpperCase();
  const playerId = parts[2];

  if (!roomCode || !playerId) {
    return new Response('Bad Request', { status: 400 });
  }

  const room = roomManager.getRoom(roomCode);
  if (!room) return new Response('Room not found', { status: 404 });
  if (!room.hasPlayer(playerId)) return new Response('Player not in room', { status: 403 });

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    const timer = room.reconnectTimers.get(playerId);
    if (timer !== undefined) {
      clearTimeout(timer);
      room.reconnectTimers.delete(playerId);
    }

    room.setConnected(playerId, true, socket);
    sendCurrentState(room, playerId);

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
      room.broadcastGameState();
      const timer = setTimeout(() => {
        room.reconnectTimers.delete(playerId);
      }, RECONNECT_WINDOW_MS);
      room.reconnectTimers.set(playerId, timer);
    } else {
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
