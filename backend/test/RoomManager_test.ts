import { assertEquals, assertMatch, assertNotEquals } from 'jsr:@std/assert';
import { RoomManager } from '../src/rooms/RoomManager.ts';

function makeManager() {
  return new RoomManager();
}

Deno.test('createRoom returns a 6-char code and a playerId', () => {
  const mgr = makeManager();
  const { roomCode, playerId } = mgr.createRoom('Alice');
  assertMatch(roomCode, /^[A-Z2-9]{6}$/);
  assertMatch(playerId, /^[0-9a-f-]{36}$/);
});

Deno.test('createRoom generates unique codes', () => {
  const mgr = makeManager();
  const codes = new Set(
    Array.from({ length: 20 }, () => mgr.createRoom('x').roomCode),
  );
  assertEquals(codes.size, 20);
});

Deno.test('getRoom returns the room after creation', () => {
  const mgr = makeManager();
  const { roomCode } = mgr.createRoom('Alice');
  const room = mgr.getRoom(roomCode);
  assertEquals(room?.code, roomCode);
  assertEquals(room?.playerCount, 1);
});

Deno.test('getRoom is case-insensitive', () => {
  const mgr = makeManager();
  const { roomCode } = mgr.createRoom('Alice');
  const room = mgr.getRoom(roomCode.toLowerCase());
  assertEquals(room?.code, roomCode);
});

Deno.test('getRoom returns undefined for unknown code', () => {
  const mgr = makeManager();
  assertEquals(mgr.getRoom('ZZZZZZ'), undefined);
});

Deno.test('joinRoom adds a new player', () => {
  const mgr = makeManager();
  const { roomCode } = mgr.createRoom('Alice');
  const result = mgr.joinRoom(roomCode, 'Bob');
  if ('error' in result) throw new Error(result.error);
  assertMatch(result.playerId, /^[0-9a-f-]{36}$/);
  assertEquals(result.isReconnect, false);
  assertEquals(mgr.getRoom(roomCode)?.playerCount, 2);
});

Deno.test('joinRoom recognises an existing playerId as reconnect', () => {
  const mgr = makeManager();
  const { roomCode, playerId } = mgr.createRoom('Alice');
  const result = mgr.joinRoom(roomCode, 'Alice', playerId);
  if ('error' in result) throw new Error(result.error);
  assertEquals(result.playerId, playerId);
  assertEquals(result.isReconnect, true);
  assertEquals(mgr.getRoom(roomCode)?.playerCount, 1);
});

Deno.test('joinRoom rejects when room is full', () => {
  const mgr = makeManager();
  const { roomCode } = mgr.createRoom('P1');
  for (let i = 2; i <= 6; i++) mgr.joinRoom(roomCode, `P${i}`);
  const result = mgr.joinRoom(roomCode, 'P7');
  assertEquals('error' in result, true);
});

Deno.test('joinRoom rejects unknown room code', () => {
  const mgr = makeManager();
  const result = mgr.joinRoom('ZZZZZZ', 'Bob');
  assertEquals('error' in result, true);
});

Deno.test('joinRoom rejects when game is in progress', () => {
  const mgr = makeManager();
  const { roomCode } = mgr.createRoom('Alice');
  mgr.joinRoom(roomCode, 'Bob');
  const room = mgr.getRoom(roomCode)!;
  room.inGame = true;
  const result = mgr.joinRoom(roomCode, 'Charlie');
  assertEquals('error' in result, true);
});

Deno.test('leaveRoom removes a non-host player', () => {
  const mgr = makeManager();
  const { roomCode } = mgr.createRoom('Alice');
  const join = mgr.joinRoom(roomCode, 'Bob');
  if ('error' in join) throw new Error(join.error);
  mgr.leaveRoom(roomCode, join.playerId);
  assertEquals(mgr.getRoom(roomCode)?.playerCount, 1);
});

Deno.test('leaveRoom migrates host when host leaves', () => {
  const mgr = makeManager();
  const { roomCode, playerId: hostId } = mgr.createRoom('Alice');
  const join = mgr.joinRoom(roomCode, 'Bob');
  if ('error' in join) throw new Error(join.error);

  mgr.leaveRoom(roomCode, hostId);

  const room = mgr.getRoom(roomCode)!;
  assertNotEquals(room.hostPlayerId, hostId);
  assertEquals(room.hostPlayerId, join.playerId);
});

Deno.test('leaveRoom destroys room when last player leaves', () => {
  const mgr = makeManager();
  const { roomCode, playerId } = mgr.createRoom('Alice');
  mgr.leaveRoom(roomCode, playerId);
  assertEquals(mgr.getRoom(roomCode), undefined);
  assertEquals(mgr.roomCount, 0);
});

Deno.test('toRoomState reflects current room status', () => {
  const mgr = makeManager();
  const { roomCode, playerId } = mgr.createRoom('Alice');
  const state = mgr.getRoom(roomCode)!.toRoomState();
  assertEquals(state.roomCode, roomCode);
  assertEquals(state.hostPlayerId, playerId);
  assertEquals(state.status, 'lobby');
  assertEquals(state.players.length, 1);
  assertEquals(state.players[0].isHost, true);
});
