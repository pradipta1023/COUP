// ─── Card ─────────────────────────────────────────────────────────────────────

export type CardName = 'Duke' | 'Assassin' | 'Captain' | 'Ambassador' | 'Contessa';

/** A card whose identity is hidden (other players' face-down cards). */
export type HiddenCard = { readonly revealed: false };

/** A card whose identity is known (your own cards, or a revealed/lost card). */
export type VisibleCard = { readonly name: CardName; readonly revealed: boolean };

/** What a client sees for any given card slot. */
export type ClientCard = HiddenCard | VisibleCard;

// ─── Actions ──────────────────────────────────────────────────────────────────

export type ActionType =
  | 'income'       // +1 coin, unblockable
  | 'foreign_aid'  // +2 coins, blockable by Duke
  | 'coup'         // 7 coins, eliminate target influence
  | 'tax'          // Duke: +3 coins
  | 'assassinate'  // Assassin: 3 coins, target loses influence (blockable by Contessa)
  | 'steal'        // Captain: take 2 coins from target (blockable by Captain/Ambassador)
  | 'exchange';    // Ambassador: swap cards with deck

export type BlockRole = 'Duke' | 'Captain' | 'Ambassador' | 'Contessa';

// ─── Game Phase ───────────────────────────────────────────────────────────────

export type GamePhase =
  | 'waiting_for_action'        // Active player must choose an action
  | 'waiting_for_reactions'     // Action declared; others may challenge or block
  | 'waiting_for_block_challenge' // A block was played; others may challenge the block
  | 'waiting_for_reveal'        // A player must reveal (lose) a card
  | 'waiting_for_exchange'      // Ambassador action: player picks which cards to keep
  | 'game_over';

// ─── Turn State ───────────────────────────────────────────────────────────────

export interface TurnState {
  readonly currentPlayerId: string;
  readonly phase: GamePhase;
  readonly pendingAction?: ActionType;
  readonly claimedRole?: CardName;         // Role claimed to perform the action
  readonly targetPlayerId?: string;        // coup / assassinate / steal
  readonly blockingPlayerId?: string;      // Who played a block
  readonly blockingRole?: CardName;        // Role they claim to block with
  readonly passedPlayerIds: string[];      // Players who have already passed the window
  readonly revealingPlayerId?: string;     // Who must next reveal a card
  /** For Ambassador exchange: the 4 cards (2 current + 2 drawn) to choose from. */
  readonly exchangeCards?: CardName[];
}

// ─── Player (client view) ─────────────────────────────────────────────────────

export interface ClientPlayer {
  readonly id: string;
  readonly name: string;
  readonly coins: number;
  /** Own cards are VisibleCard; other players' face-down cards are HiddenCard. */
  readonly cards: ClientCard[];
  readonly isEliminated: boolean;
  readonly isHost: boolean;
  readonly isConnected: boolean;
}

// ─── Action Log ───────────────────────────────────────────────────────────────

export type LogEntryType = 'action' | 'challenge' | 'block' | 'system' | 'result';

export interface LogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly message: string;
  readonly type: LogEntryType;
}

// ─── Game State (client view) ─────────────────────────────────────────────────

export interface ClientGameState {
  readonly players: ClientPlayer[];
  readonly turnState: TurnState;
  readonly actionLog: LogEntry[];
  readonly winnerId?: string;
  readonly winnerName?: string;
}

// ─── Room / Lobby ─────────────────────────────────────────────────────────────

export interface LobbyPlayer {
  readonly id: string;
  readonly name: string;
  readonly isHost: boolean;
  readonly isConnected: boolean;
}

export interface RoomState {
  readonly roomCode: string;
  readonly players: LobbyPlayer[];
  readonly hostPlayerId: string;
  readonly status: 'lobby' | 'in_game';
}

// ─── Client → Server Messages ─────────────────────────────────────────────────

export type ClientMessage =
  | { readonly type: 'join'; readonly roomCode: string; readonly playerName: string; readonly playerId?: string }
  | { readonly type: 'start_game' }
  | { readonly type: 'take_action'; readonly action: ActionType; readonly targetPlayerId?: string }
  | { readonly type: 'challenge' }
  | { readonly type: 'block'; readonly role: BlockRole }
  | { readonly type: 'pass' }
  | { readonly type: 'reveal_card'; readonly cardIndex: number }
  | { readonly type: 'exchange_cards'; readonly keepIndices: [number, number] }
  | { readonly type: 'chat'; readonly message: string };

// ─── Server → Client Messages ─────────────────────────────────────────────────

export type ServerMessage =
  | { readonly type: 'room_update'; readonly room: RoomState }
  | { readonly type: 'game_started'; readonly gameState: ClientGameState }
  | { readonly type: 'game_state'; readonly gameState: ClientGameState }
  | { readonly type: 'action_log'; readonly entry: LogEntry }
  | { readonly type: 'error'; readonly message: string }
  | { readonly type: 'chat'; readonly playerId: string; readonly playerName: string; readonly message: string; readonly timestamp: number }
  | { readonly type: 'game_over'; readonly winnerId: string; readonly winnerName: string };
