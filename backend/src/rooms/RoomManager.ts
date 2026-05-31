import { Room } from './Room.ts';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_PLAYERS = 6;

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  private generateCode(): string {
    let code: string;
    do {
      code = Array.from(
        { length: CODE_LENGTH },
        () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }

  private generatePlayerId(): string {
    return crypto.randomUUID();
  }

  createRoom(hostName: string): { roomCode: string; playerId: string } {
    const roomCode = this.generateCode();
    const playerId = this.generatePlayerId();
    this.rooms.set(roomCode, new Room(roomCode, playerId, hostName));
    return { roomCode, playerId };
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  /** Returns the playerId to use (new or existing on reconnect). */
  joinRoom(roomCode: string, playerName: string, existingPlayerId?: string): {
    playerId: string;
    isReconnect: boolean;
  } | { error: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { error: 'Room not found' };
    if (room.inGame) return { error: 'Game already in progress' };

    if (existingPlayerId && room.hasPlayer(existingPlayerId)) {
      return { playerId: existingPlayerId, isReconnect: true };
    }

    if (room.playerCount >= MAX_PLAYERS) return { error: 'Room is full' };

    const playerId = this.generatePlayerId();
    room.addPlayer(playerId, playerName);
    return { playerId, isReconnect: false };
  }

  leaveRoom(roomCode: string, playerId: string): void {
    const room = this.getRoom(roomCode);
    if (!room) return;
    room.removePlayer(playerId);
    if (room.isEmpty) {
      this.rooms.delete(roomCode);
    }
  }

  destroyRoom(roomCode: string): void {
    this.rooms.delete(roomCode);
  }

  get roomCount(): number {
    return this.rooms.size;
  }
}

export const roomManager = new RoomManager();
