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

/**
 * Why a player must reveal a card — determines what happens after the reveal.
 * challenge_fail_action: challenger lost action challenge → original action executes after reveal
 * challenge_won_action:  claimer lost action challenge → turn advances after reveal
 * challenge_won_block:   blocker lost block challenge  → original action executes after reveal
 * coup / assassinate:    target forced to lose influence → turn advances after reveal
 */
export type RevealReason =
  | 'coup'
  | 'assassinate'
  | 'challenge_fail_action'
  | 'challenge_won_action'
  | 'challenge_won_block';

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
  revealReason?: RevealReason;
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
