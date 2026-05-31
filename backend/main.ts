import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors({
  origin: ['http://localhost:5173', 'https://*.vercel.app'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));

app.get('/health', (c) => c.json({ status: 'ok' }));

const port = parseInt(Deno.env.get('PORT') ?? '8000');
console.log(`Backend listening on http://localhost:${port}`);

Deno.serve({ port }, app.fetch);
