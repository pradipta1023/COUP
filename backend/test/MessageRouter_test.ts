import { assertEquals } from 'jsr:@std/assert';
import { routeMessage } from '../ws/MessageRouter.ts';
import { ReactionWindow } from '../ws/ReactionWindow.ts';
import { Room } from '../rooms/Room.ts';

// ─── Mock socket ──────────────────────────────────────────────────────────────

interface Sent {
  parsed: Record<string, unknown>;
}

function mockSocket(): { socket: WebSocket; sent: Sent[] } {
  const sent: Sent[] = [];
  const socket = {
    readyState: WebSocket.OPEN,
    send: (data: string) => sent.push({ parsed: JSON.parse(data) }),
  } as unknown as WebSocket;
  return { socket, sent };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRoom(): { room: Room; p1Socket: Sent[]; p2Socket: Sent[] } {
  const room = new Room('TEST01', 'p1', 'Alice');
  room.addPlayer('p2', 'Bob');

  const { socket: s1, sent: p1Socket } = mockSocket();
  const { socket: s2, sent: p2Socket } = mockSocket();

  room.setConnected('p1', true, s1);
  room.setConnected('p2', true, s2);

  return { room, p1Socket, p2Socket };
}

function lastMsg(sent: Sent[]): Record<string, unknown> {
  return sent[sent.length - 1].parsed;
}

// ─── chat ─────────────────────────────────────────────────────────────────────

Deno.test('chat broadcasts to all players', () => {
  const { room, p1Socket, p2Socket } = makeRoom();
  routeMessage(room, 'p1', JSON.stringify({ type: 'chat', message: 'hello' }));
  assertEquals(lastMsg(p1Socket).type, 'chat');
  assertEquals(lastMsg(p2Socket).type, 'chat');
  assertEquals(lastMsg(p1Socket).message, 'hello');
});

Deno.test('chat trims and ignores empty messages', () => {
  const { room, p1Socket } = makeRoom();
  const before = p1Socket.length;
  routeMessage(room, 'p1', JSON.stringify({ type: 'chat', message: '   ' }));
  assertEquals(p1Socket.length, before);
});

Deno.test('chat truncates long messages to 500 chars', () => {
  const { room, p1Socket } = makeRoom();
  routeMessage(
    room,
    'p1',
    JSON.stringify({ type: 'chat', message: 'x'.repeat(600) }),
  );
  assertEquals((lastMsg(p1Socket).message as string).length, 500);
});

// ─── start_game ───────────────────────────────────────────────────────────────

Deno.test('start_game initialises game and broadcasts game_started', () => {
  const { room, p1Socket, p2Socket } = makeRoom();
  routeMessage(room, 'p1', JSON.stringify({ type: 'start_game' }));
  assertEquals(room.inGame, true);
  assertEquals(room.gameState !== null, true);
  assertEquals(lastMsg(p1Socket).type, 'game_started');
  assertEquals(lastMsg(p2Socket).type, 'game_started');
});

Deno.test('start_game rejected for non-host', () => {
  const { room, p2Socket } = makeRoom();
  routeMessage(room, 'p2', JSON.stringify({ type: 'start_game' }));
  assertEquals(lastMsg(p2Socket).type, 'error');
});

Deno.test('start_game rejected with fewer than 2 players', () => {
  const room = new Room('TEST02', 'p1', 'Alice');
  const { socket, sent } = mockSocket();
  room.setConnected('p1', true, socket);
  routeMessage(room, 'p1', JSON.stringify({ type: 'start_game' }));
  assertEquals(lastMsg(sent).type, 'error');
});

// ─── take_action ──────────────────────────────────────────────────────────────

Deno.test('income advances turn and broadcasts game_state', () => {
  const { room, p1Socket } = makeRoom();
  routeMessage(room, 'p1', JSON.stringify({ type: 'start_game' }));
  const coinsBefore = room.gameState!.players.find((p) => p.id === 'p1')!.coins;

  routeMessage(
    room,
    'p1',
    JSON.stringify({ type: 'take_action', action: 'income' }),
  );

  assertEquals(
    room.gameState!.players.find((p) => p.id === 'p1')!.coins,
    coinsBefore + 1,
  );
  assertEquals(lastMsg(p1Socket).type, 'game_state');
});

Deno.test('action rejected when not player turn', () => {
  const { room, p2Socket } = makeRoom();
  routeMessage(room, 'p1', JSON.stringify({ type: 'start_game' }));

  // p2 tries to take action when it is p1's turn
  routeMessage(
    room,
    'p2',
    JSON.stringify({ type: 'take_action', action: 'income' }),
  );
  assertEquals(lastMsg(p2Socket).type, 'error');
});

// ─── challenge / block / pass ─────────────────────────────────────────────────

Deno.test('foreign aid → p2 passes → p1 gets +2 coins', () => {
  const { room } = makeRoom();
  routeMessage(room, 'p1', JSON.stringify({ type: 'start_game' }));
  const coinsBefore = room.gameState!.players.find((p) => p.id === 'p1')!.coins;

  routeMessage(
    room,
    'p1',
    JSON.stringify({ type: 'take_action', action: 'foreign_aid' }),
  );
  assertEquals(room.gameState!.turnState.phase, 'waiting_for_reactions');

  routeMessage(room, 'p2', JSON.stringify({ type: 'pass' }));
  assertEquals(
    room.gameState!.players.find((p) => p.id === 'p1')!.coins,
    coinsBefore + 2,
  );
  assertEquals(room.gameState!.turnState.currentPlayerId, 'p2');
});

Deno.test('foreign aid → p2 blocks with Duke → p1 passes → action cancelled', () => {
  const { room } = makeRoom();
  routeMessage(room, 'p1', JSON.stringify({ type: 'start_game' }));
  const coinsBefore = room.gameState!.players.find((p) => p.id === 'p1')!.coins;

  routeMessage(
    room,
    'p1',
    JSON.stringify({ type: 'take_action', action: 'foreign_aid' }),
  );
  routeMessage(room, 'p2', JSON.stringify({ type: 'block', role: 'Duke' }));
  routeMessage(room, 'p1', JSON.stringify({ type: 'pass' }));

  // Action cancelled — p1 should not gain coins
  assertEquals(
    room.gameState!.players.find((p) => p.id === 'p1')!.coins,
    coinsBefore,
  );
  assertEquals(room.gameState!.turnState.currentPlayerId, 'p2');
});

// ─── invalid JSON ─────────────────────────────────────────────────────────────

Deno.test('invalid JSON sends error to sender', () => {
  const { room, p1Socket } = makeRoom();
  routeMessage(room, 'p1', 'not json!!');
  assertEquals(lastMsg(p1Socket).type, 'error');
});

// ─── ReactionWindow timeout ───────────────────────────────────────────────────

Deno.test('reaction window auto-passes and resolves after timeout', async () => {
  const { room } = makeRoom();
  routeMessage(room, 'p1', JSON.stringify({ type: 'start_game' }));

  const coinsBefore = room.gameState!.players.find((p) => p.id === 'p1')!.coins;

  // Import with short timeout for testing
  const win = new ReactionWindow();

  let resolved = false;
  win.start(() => {
    resolved = true;
  }, 20);

  await new Promise((r) => setTimeout(r, 50));
  assertEquals(resolved, true);
  win.clear(); // no-op after fired, but safe

  // Verify isActive resets after fire
  assertEquals(win.isActive, false);

  // Coins should still be coinsBefore since we didn't run through router here
  assertEquals(
    room.gameState!.players.find((p) => p.id === 'p1')!.coins,
    coinsBefore,
  );
});
