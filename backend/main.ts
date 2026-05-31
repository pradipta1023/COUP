import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { roomManager } from './src/rooms/RoomManager.ts';
import { handleWsRequest } from './src/ws/ConnectionManager.ts';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (/^http:\/\/localhost:\d+$/.test(origin)) return origin;
      if (origin.endsWith('.vercel.app')) return origin;
      return '';
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

app.use(logger());

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/rooms/:code', (c) => {
  const room = roomManager.getRoom(c.req.param('code'));
  if (!room) return c.json({ error: 'Room not found' }, 404);
  return c.json(room.toRoomState());
});

app.post('/rooms/create', async (c) => {
  const body = await c.req.json<{ hostName: string }>();
  if (!body?.hostName?.trim()) {
    return c.json({ error: 'hostName is required' }, 400);
  }
  const result = roomManager.createRoom(body.hostName.trim());
  return c.json(result, 201);
});

app.post('/rooms/:code/join', async (c) => {
  const body = await c.req.json<{ playerName: string }>();
  if (!body?.playerName?.trim()) {
    return c.json({ error: 'playerName is required' }, 400);
  }
  const result = roomManager.joinRoom(
    c.req.param('code'),
    body.playerName.trim(),
  );
  if ('error' in result) return c.json({ error: result.error }, 409);
  return c.json({ playerId: result.playerId }, 201);
});

const port = parseInt(Deno.env.get('PORT') ?? '8000');
console.log(`Backend listening on http://localhost:${port}`);

// WebSocket upgrade requests bypass Hono entirely to avoid CORS middleware
// corrupting the 101 Switching Protocols response.
Deno.serve({ port, hostname: '::' }, (req) => {
  const url = new URL(req.url);
  if (url.pathname.startsWith('/ws/') && req.headers.get('upgrade') === 'websocket') {
    return handleWsRequest(req);
  }
  return app.fetch(req);
});
