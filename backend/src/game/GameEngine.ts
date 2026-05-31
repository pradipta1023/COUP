import type { ActionType, CardName, ClientCard, ClientGameState, ClientPlayer } from '@shared/types.ts';
import { buildDeck, drawCard, returnAndShuffle, shuffle } from './Deck.ts';
import type { GameEvent, RevealReason, ServerCard, ServerGameState, ServerPlayer, ServerTurnState } from './types.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(message: string, type: GameEvent['type']): GameEvent {
  return { id: crypto.randomUUID(), timestamp: Date.now(), message, type };
}

function playerById(state: ServerGameState, id: string): ServerPlayer {
  const p = state.players.find((p) => p.id === id);
  if (!p) throw new Error(`Player ${id} not found`);
  return p;
}

function livingPlayers(state: ServerGameState): ServerPlayer[] {
  return state.players.filter((p) => !p.isEliminated);
}

function nextTurnIndex(state: ServerGameState): number {
  const living = state.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.isEliminated);
  const currentPos = living.findIndex(({ p }) => p.id === state.turnState.currentPlayerId);
  return living[(currentPos + 1) % living.length].i;
}

function advanceTurn(state: ServerGameState): ServerGameState {
  const idx = nextTurnIndex(state);
  return {
    ...state,
    turnIndex: idx,
    turnState: {
      currentPlayerId: state.players[idx].id,
      phase: 'waiting_for_action',
      passedPlayerIds: [],
    },
  };
}

function eliminateIfNeeded(state: ServerGameState, playerId: string): ServerGameState {
  const player = playerById(state, playerId);
  const unrevealed = player.cards.filter((c) => !c.revealed).length;
  if (unrevealed > 0) return state;

  const updatedPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, isEliminated: true } : p
  );
  return { ...state, players: updatedPlayers };
}

function checkWin(state: ServerGameState): ServerGameState {
  const alive = livingPlayers(state);
  if (alive.length === 1) {
    return {
      ...state,
      winnerId: alive[0].id,
      winnerName: alive[0].name,
      turnState: { ...state.turnState, phase: 'game_over' },
    };
  }
  return state;
}

/** Force a player to reveal one specific card (by index). */
function revealCard(state: ServerGameState, playerId: string, cardIndex: number): {
  state: ServerGameState;
  events: GameEvent[];
} {
  const events: GameEvent[] = [];
  const player = playerById(state, playerId);
  const card = player.cards[cardIndex];
  if (!card || card.revealed) {
    throw new Error('Invalid card index');
  }

  const updatedPlayers = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const cards = p.cards.map((c, i) => i === cardIndex ? { ...c, revealed: true } : c);
    return { ...p, cards };
  });

  events.push(makeEvent(`${player.name} reveals ${card.name}`, 'result'));

  let newState: ServerGameState = { ...state, players: updatedPlayers };
  newState = eliminateIfNeeded(newState, playerId);

  if (newState.players.find((p) => p.id === playerId)?.isEliminated) {
    events.push(makeEvent(`${player.name} is eliminated`, 'system'));
  }

  return { state: newState, events };
}

// ─── Role → Action mapping ─────────────────────────────────────────────────

const ACTION_ROLE: Partial<Record<ActionType, CardName>> = {
  tax: 'Duke',
  assassinate: 'Assassin',
  steal: 'Captain',
  exchange: 'Ambassador',
};

const BLOCK_RULES: Partial<Record<ActionType, CardName[]>> = {
  foreign_aid: ['Duke'],
  assassinate: ['Contessa'],
  steal: ['Captain', 'Ambassador'],
};

// ─── Init ──────────────────────────────────────────────────────────────────────

export interface PlayerSeed {
  id: string;
  name: string;
  isHost: boolean;
}

export function initGame(players: PlayerSeed[]): ServerGameState {
  let deck = shuffle(buildDeck());
  const serverPlayers: ServerPlayer[] = players.map((p) => {
    const draw1 = drawCard(deck)!;
    deck = draw1.remaining;
    const draw2 = drawCard(deck)!;
    deck = draw2.remaining;
    return {
      id: p.id,
      name: p.name,
      coins: 2,
      cards: [
        { name: draw1.card, revealed: false },
        { name: draw2.card, revealed: false },
      ],
      isEliminated: false,
      isHost: p.isHost,
      isConnected: true,
    };
  });

  const firstPlayer = serverPlayers[0];
  return {
    players: serverPlayers,
    deck,
    turnIndex: 0,
    turnState: {
      currentPlayerId: firstPlayer.id,
      phase: 'waiting_for_action',
      passedPlayerIds: [],
    },
    actionLog: [makeEvent('Game started', 'system')],
  };
}

// ─── Declare Action (opens reaction window if needed) ─────────────────────────

export function declareAction(
  state: ServerGameState,
  playerId: string,
  action: ActionType,
  targetPlayerId?: string,
): { state: ServerGameState; events: GameEvent[]; needsReaction: boolean } {
  const events: GameEvent[] = [];
  const player = playerById(state, playerId);

  if (state.turnState.currentPlayerId !== playerId) throw new Error('Not your turn');
  if (state.turnState.phase !== 'waiting_for_action') throw new Error('Wrong phase');

  // Forced coup at 10+ coins
  if (player.coins >= 10 && action !== 'coup') throw new Error('Must coup at 10+ coins');

  // Coin requirements
  if (action === 'coup' && player.coins < 7) throw new Error('Need 7 coins for coup');
  if (action === 'assassinate' && player.coins < 3) throw new Error('Need 3 coins to assassinate');

  // Target required
  if (['coup', 'assassinate', 'steal'].includes(action) && !targetPlayerId) {
    throw new Error(`${action} requires a target`);
  }
  if (targetPlayerId) {
    const target = playerById(state, targetPlayerId);
    if (target.isEliminated) throw new Error('Target is eliminated');
  }

  const claimedRole = ACTION_ROLE[action];
  const canBeReacted = action !== 'income' && action !== 'coup';

  const actionLabel = claimedRole ? `claims ${claimedRole} to` : '';
  const targetLabel = targetPlayerId
    ? ` targeting ${playerById(state, targetPlayerId).name}`
    : '';
  events.push(makeEvent(`${player.name} ${actionLabel} ${action}${targetLabel}`, 'action'));

  if (!canBeReacted) {
    // Instant actions: income and coup
    let newState = applyInstantAction(state, player, action, targetPlayerId);
    newState = { ...newState, actionLog: [...newState.actionLog, ...events] };
    return { state: newState, events, needsReaction: false };
  }

  // Open reaction window
  const newTurnState: ServerTurnState = {
    ...state.turnState,
    phase: 'waiting_for_reactions',
    pendingAction: action,
    claimedRole,
    targetPlayerId,
    passedPlayerIds: [],
  };
  return {
    state: {
      ...state,
      turnState: newTurnState,
      actionLog: [...state.actionLog, ...events],
    },
    events,
    needsReaction: true,
  };
}

function applyInstantAction(
  state: ServerGameState,
  player: ServerPlayer,
  action: ActionType,
  targetPlayerId?: string,
): ServerGameState {
  if (action === 'income') {
    return advanceTurn(updateCoins(state, player.id, 1));
  }
  if (action === 'coup') {
    const updatedState = updateCoins(state, player.id, -7);
    return {
      ...updatedState,
      turnState: {
        ...updatedState.turnState,
        phase: 'waiting_for_reveal',
        revealReason: 'coup' as RevealReason,
        revealingPlayerId: targetPlayerId,
        pendingAction: 'coup',
        targetPlayerId,
        passedPlayerIds: [],
      },
    };
  }
  return state;
}

function updateCoins(state: ServerGameState, playerId: string, delta: number): ServerGameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, coins: Math.max(0, p.coins + delta) } : p
    ),
  };
}

// ─── Challenge ────────────────────────────────────────────────────────────────

export function applyChallenge(
  state: ServerGameState,
  challengerId: string,
): { state: ServerGameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const { turnState } = state;

  if (turnState.phase !== 'waiting_for_reactions' && turnState.phase !== 'waiting_for_block_challenge') {
    throw new Error('Cannot challenge now');
  }

  const isBlockChallenge = turnState.phase === 'waiting_for_block_challenge';
  const claimedById = isBlockChallenge ? turnState.blockingPlayerId! : turnState.currentPlayerId;
  const claimedRole = isBlockChallenge ? turnState.blockingRole! : turnState.claimedRole!;

  const claimingPlayer = playerById(state, claimedById);
  const challenger = playerById(state, challengerId);

  events.push(makeEvent(`${challenger.name} challenges ${claimingPlayer.name}'s claim of ${claimedRole}`, 'challenge'));

  // Does the claiming player actually hold the claimed role?
  const matchingCardIndex = claimingPlayer.cards.findIndex(
    (c) => !c.revealed && c.name === claimedRole,
  );
  const claimIsTrue = matchingCardIndex !== -1;

  if (claimIsTrue) {
    // Challenger loses influence; claimer shuffles card back and draws a new one
    events.push(makeEvent(`${claimingPlayer.name} reveals ${claimedRole} — challenge fails`, 'result'));

    // Replace claimer's revealed card with a fresh draw
    let newDeck = state.deck;
    const draw = drawCard(newDeck);
    const updatedPlayers = state.players.map((p) => {
      if (p.id !== claimedById) return p;
      const cards = p.cards.map((c, i) =>
        i === matchingCardIndex ? { name: draw ? draw.card : c.name, revealed: false } : c
      );
      newDeck = draw
        ? returnAndShuffle(draw.remaining, claimedRole)
        : returnAndShuffle(newDeck, claimedRole);
      return { ...p, cards };
    });

    let newState: ServerGameState = { ...state, players: updatedPlayers, deck: newDeck };

    // Challenger must reveal a card; after they do, the original action either
    // continues (action challenge) or is cancelled (block challenge).
    const revealReason: RevealReason = isBlockChallenge
      ? 'challenge_won_action' // block stood → action cancelled after challenger reveals
      : 'challenge_fail_action'; // action continues after challenger reveals

    newState = {
      ...newState,
      turnState: {
        ...newState.turnState,
        phase: 'waiting_for_reveal',
        revealReason,
        revealingPlayerId: challengerId,
      },
    };

    return { state: { ...newState, actionLog: [...newState.actionLog, ...events] }, events };
  } else {
    // Claimer loses influence (challenge succeeds) — let the claimer CHOOSE which card to reveal
    events.push(makeEvent(`${claimingPlayer.name} cannot prove ${claimedRole} — challenge succeeds`, 'result'));

    const revealReason: RevealReason = isBlockChallenge
      ? 'challenge_won_block'  // block busted → original action proceeds after claimer reveals
      : 'challenge_won_action'; // action busted → turn advances after claimer reveals

    const newState: ServerGameState = {
      ...state,
      turnState: {
        ...state.turnState,
        phase: 'waiting_for_reveal',
        revealReason,
        revealingPlayerId: claimedById,
      },
      actionLog: [...state.actionLog, ...events],
    };

    return { state: newState, events };
  }
}

// ─── Block ────────────────────────────────────────────────────────────────────

export function applyBlock(
  state: ServerGameState,
  blockerId: string,
  role: CardName,
): { state: ServerGameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const { turnState } = state;

  if (turnState.phase !== 'waiting_for_reactions') throw new Error('Cannot block now');
  const action = turnState.pendingAction!;
  const allowedBlockRoles = BLOCK_RULES[action] ?? [];
  if (!allowedBlockRoles.includes(role)) throw new Error(`${role} cannot block ${action}`);

  const blocker = playerById(state, blockerId);
  events.push(makeEvent(`${blocker.name} claims ${role} to block`, 'block'));

  const newState: ServerGameState = {
    ...state,
    turnState: {
      ...turnState,
      phase: 'waiting_for_block_challenge',
      blockingPlayerId: blockerId,
      blockingRole: role,
      passedPlayerIds: [],
    },
    actionLog: [...state.actionLog, ...events],
  };

  return { state: newState, events };
}

// ─── Pass ─────────────────────────────────────────────────────────────────────

export function applyPass(
  state: ServerGameState,
  playerId: string,
): { state: ServerGameState; events: GameEvent[]; actionResolved: boolean } {
  const { turnState } = state;
  const phase = turnState.phase;

  if (phase !== 'waiting_for_reactions' && phase !== 'waiting_for_block_challenge') {
    throw new Error('Cannot pass now');
  }

  const passed = [...turnState.passedPlayerIds, playerId];
  const otherActivePlayers = state.players.filter(
    (p) => !p.isEliminated && p.id !== turnState.currentPlayerId,
  );

  // For block challenge phase, only the action declarer can pass (accept the block)
  const waitingForIds = phase === 'waiting_for_block_challenge'
    ? [turnState.currentPlayerId]
    : otherActivePlayers.map((p) => p.id).filter((id) => id !== turnState.blockingPlayerId);

  const allPassed = waitingForIds.every((id) => passed.includes(id));

  if (!allPassed) {
    return {
      state: {
        ...state,
        turnState: { ...turnState, passedPlayerIds: passed },
      },
      events: [],
      actionResolved: false,
    };
  }

  // Everyone passed → resolve
  const events: GameEvent[] = [];
  let newState: ServerGameState;

  if (phase === 'waiting_for_block_challenge') {
    // Block accepted — action is cancelled, advance turn
    events.push(makeEvent('Block accepted — action cancelled', 'system'));
    newState = advanceTurn({ ...state, turnState: { ...turnState, passedPlayerIds: passed } });
  } else {
    // No challenges/blocks — resolve the action
    newState = resolveAction({ ...state, turnState: { ...turnState, passedPlayerIds: passed } }, events);
  }

  return {
    state: { ...newState, actionLog: [...newState.actionLog, ...events] },
    events,
    actionResolved: true,
  };
}

// ─── Resolve pending action ───────────────────────────────────────────────────

function resolveAction(state: ServerGameState, events: GameEvent[]): ServerGameState {
  const { turnState } = state;
  const action = turnState.pendingAction!;
  const actorId = turnState.currentPlayerId;
  const targetId = turnState.targetPlayerId;
  const actor = playerById(state, actorId);

  switch (action) {
    case 'foreign_aid': {
      events.push(makeEvent(`${actor.name} takes Foreign Aid (+2 coins)`, 'result'));
      return advanceTurn(updateCoins(state, actorId, 2));
    }
    case 'tax': {
      events.push(makeEvent(`${actor.name} collects Tax (+3 coins)`, 'result'));
      return advanceTurn(updateCoins(state, actorId, 3));
    }
    case 'steal': {
      const target = playerById(state, targetId!);
      const stolen = Math.min(2, target.coins);
      events.push(makeEvent(`${actor.name} steals ${stolen} coin(s) from ${target.name}`, 'result'));
      let s = updateCoins(state, targetId!, -stolen);
      s = updateCoins(s, actorId, stolen);
      return advanceTurn(s);
    }
    case 'assassinate': {
      const s = updateCoins(state, actorId, -3);
      events.push(makeEvent(`${actor.name} assassinates ${playerById(state, targetId!).name}`, 'result'));
      return {
        ...s,
        turnState: {
          ...s.turnState,
          phase: 'waiting_for_reveal',
          revealReason: 'assassinate' as RevealReason,
          revealingPlayerId: targetId,
        },
      };
    }
    case 'exchange': {
      // Draw 2 cards from deck, let player choose which 2 to keep
      const draws: CardName[] = [];
      let deck = state.deck;
      for (let i = 0; i < 2; i++) {
        const d = drawCard(deck);
        if (d) { draws.push(d.card); deck = d.remaining; }
      }
      const ownCards = actor.cards.filter((c) => !c.revealed).map((c) => c.name);
      events.push(makeEvent(`${actor.name} begins Ambassador exchange`, 'action'));
      return {
        ...state,
        deck,
        turnState: {
          ...state.turnState,
          phase: 'waiting_for_exchange',
          exchangeCards: [...ownCards, ...draws],
        },
      };
    }
    default:
      return advanceTurn(state);
  }
}

// ─── Reveal card (when instructed by server) ──────────────────────────────────

export function applyReveal(
  state: ServerGameState,
  playerId: string,
  cardIndex: number,
): { state: ServerGameState; events: GameEvent[] } {
  if (state.turnState.phase !== 'waiting_for_reveal') throw new Error('Not in reveal phase');
  if (state.turnState.revealingPlayerId !== playerId) throw new Error('Not your reveal');

  const reason = state.turnState.revealReason;
  const { state: afterReveal, events } = revealCard(state, playerId, cardIndex);
  let newState = checkWin(afterReveal);

  if (newState.turnState.phase !== 'game_over') {
    if (reason === 'challenge_fail_action' || reason === 'challenge_won_block') {
      // Original action must now execute
      newState = resolveAction(newState, events);
    } else {
      // coup, assassinate, challenge_won_action — just advance turn
      newState = advanceTurn(newState);
    }
  }

  return { state: { ...newState, actionLog: [...newState.actionLog, ...events] }, events };
}

// ─── Ambassador exchange ───────────────────────────────────────────────────────

export function applyExchange(
  state: ServerGameState,
  playerId: string,
  keepIndices: [number, number],
): { state: ServerGameState; events: GameEvent[] } {
  if (state.turnState.phase !== 'waiting_for_exchange') throw new Error('Not in exchange phase');
  if (state.turnState.currentPlayerId !== playerId) throw new Error('Not your exchange');

  const exchangeCards = state.turnState.exchangeCards!;
  const [i, j] = keepIndices;
  if (i === j || i < 0 || j < 0 || i >= exchangeCards.length || j >= exchangeCards.length) {
    throw new Error('Invalid exchange indices');
  }

  const kept = [exchangeCards[i], exchangeCards[j]];
  const returned = exchangeCards.filter((_, idx) => idx !== i && idx !== j);

  // Return unchosen cards to deck
  let deck = state.deck;
  for (const card of returned) {
    deck = returnAndShuffle(deck, card);
  }

  const player = playerById(state, playerId);
  // Replace unrevealed cards with chosen cards; keep revealed cards as-is
  const revealedCards = player.cards.filter((c) => c.revealed);
  const newCards: ServerCard[] = [
    ...revealedCards,
    ...kept.map((name) => ({ name, revealed: false })),
  ];

  const updatedPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, cards: newCards } : p
  );

  const events: GameEvent[] = [
    makeEvent(`${player.name} completes Ambassador exchange`, 'result'),
  ];

  const newState = advanceTurn({ ...state, players: updatedPlayers, deck });
  return { state: { ...newState, actionLog: [...newState.actionLog, ...events] }, events };
}

// ─── Serialize for client ─────────────────────────────────────────────────────

export function toClientGameState(state: ServerGameState, forPlayerId: string): ClientGameState {
  const players: ClientPlayer[] = state.players.map((p) => {
    const cards: ClientCard[] = p.cards.map((c) => {
      if (c.revealed) return { name: c.name, revealed: true };
      if (p.id === forPlayerId) return { name: c.name, revealed: false };
      return { revealed: false };
    });
    return {
      id: p.id,
      name: p.name,
      coins: p.coins,
      cards,
      isEliminated: p.isEliminated,
      isHost: p.isHost,
      isConnected: p.isConnected,
    };
  });

  return {
    players,
    turnState: {
      currentPlayerId: state.turnState.currentPlayerId,
      phase: state.turnState.phase,
      pendingAction: state.turnState.pendingAction,
      claimedRole: state.turnState.claimedRole,
      targetPlayerId: state.turnState.targetPlayerId,
      blockingPlayerId: state.turnState.blockingPlayerId,
      blockingRole: state.turnState.blockingRole,
      passedPlayerIds: state.turnState.passedPlayerIds,
      revealingPlayerId: state.turnState.revealingPlayerId,
      // Only reveal exchangeCards to the player doing the exchange
      exchangeCards: state.turnState.currentPlayerId === forPlayerId
        ? state.turnState.exchangeCards
        : undefined,
    },
    actionLog: state.actionLog,
    winnerId: state.winnerId,
    winnerName: state.winnerName,
  };
}
