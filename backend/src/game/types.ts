import type { ActionType, CardName, GamePhase, LogEntryType } from '@shared/types.ts';

export interface ServerCard {
  name: CardName;
  revealed: boolean;
}

export interface ServerPlayer {
  id: string;
  name: string;
  coins: number;
  cards: ServerCard[];
  isEliminated: boolean;
  isHost: boolean;
  isConnected: boolean;
}

export interface ServerTurnState {
  currentPlayerId: string;
  phase: GamePhase;
  pendingAction?: ActionType;
  claimedRole?: CardName;
  targetPlayerId?: string;
  blockingPlayerId?: string;
  blockingRole?: CardName;
  passedPlayerIds: string[];
  revealingPlayerId?: string;
  exchangeCards?: CardName[];
}

export interface ServerGameState {
  players: ServerPlayer[];
  deck: CardName[];
  turnIndex: number;
  turnState: ServerTurnState;
  actionLog: GameEvent[];
  winnerId?: string;
  winnerName?: string;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  message: string;
  type: LogEntryType;
}
