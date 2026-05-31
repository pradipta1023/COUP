import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { roomManager } from './src/rooms/RoomManager.ts';

const app = new Hono();

app.use('*', cors({
  origin: ['http://localhost:5173', 'https://*.vercel.app'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.post('/rooms', async (c) => {
  const body = await c.req.json<{ hostName: string }>();
  if (!body?.hostName?.trim()) {
    return c.json({ error: 'hostName is required' }, 400);
  }
  const result = roomManager.createRoom(body.hostName.trim());
  return c.json(result, 201);
});

app.get('/rooms/:code', (c) => {
  const room = roomManager.getRoom(c.req.param('code'));
  if (!room) return c.json({ error: 'Room not found' }, 404);
  return c.json(room.toRoomState());
});

const port = parseInt(Deno.env.get('PORT') ?? '8000');
console.log(`Backend listening on http://localhost:${port}`);

Deno.serve({ port }, app.fetch);
