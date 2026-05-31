import type { LobbyPlayer, RoomState } from '@shared/types.ts';

export interface RoomPlayer {
  id: string;
  name: string;
  isConnected: boolean;
  socket: WebSocket | null;
}

export class Room {
  readonly code: string;
  private players: Map<string, RoomPlayer> = new Map();
  private hostId: string;
  inGame = false;

  constructor(code: string, hostId: string, hostName: string) {
    this.code = code;
    this.hostId = hostId;
    this.players.set(hostId, { id: hostId, name: hostName, isConnected: true, socket: null });
  }

  get playerCount(): number {
    return this.players.size;
  }

  get isEmpty(): boolean {
    return this.players.size === 0;
  }

  get hostPlayerId(): string {
    return this.hostId;
  }

  hasPlayer(playerId: string): boolean {
    return this.players.has(playerId);
  }

  getPlayer(playerId: string): RoomPlayer | undefined {
    return this.players.get(playerId);
  }

  getPlayers(): RoomPlayer[] {
    return Array.from(this.players.values());
  }

  addPlayer(id: string, name: string): void {
    this.players.set(id, { id, name, isConnected: true, socket: null });
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    if (this.hostId === playerId) {
      this.migrateHost();
    }
  }

  setConnected(playerId: string, connected: boolean, socket: WebSocket | null = null): void {
    const player = this.players.get(playerId);
    if (player) {
      player.isConnected = connected;
      player.socket = socket;
    }
  }

  private migrateHost(): void {
    const next = this.players.values().next().value;
    if (next) {
      this.hostId = next.id;
    }
  }

  toRoomState(): RoomState {
    const lobbyPlayers: LobbyPlayer[] = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.id === this.hostId,
      isConnected: p.isConnected,
    }));
    return {
      roomCode: this.code,
      players: lobbyPlayers,
      hostPlayerId: this.hostId,
      status: this.inGame ? 'in_game' : 'lobby',
    };
  }

  broadcast(message: unknown, excludeId?: string): void {
    const payload = JSON.stringify(message);
    for (const player of this.players.values()) {
      if (player.id !== excludeId && player.socket?.readyState === WebSocket.OPEN) {
        player.socket.send(payload);
      }
    }
  }

  send(playerId: string, message: unknown): void {
    const player = this.players.get(playerId);
    if (player?.socket?.readyState === WebSocket.OPEN) {
      player.socket.send(JSON.stringify(message));
    }
  }
}
