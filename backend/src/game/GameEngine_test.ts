import { assertEquals, assertMatch, assertThrows } from 'jsr:@std/assert';
import {
  applyBlock,
  applyChallenge,
  applyExchange,
  applyPass,
  applyReveal,
  declareAction,
  initGame,
  toClientGameState,
} from './GameEngine.ts';
import type { ServerGameState } from './types.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function twoPlayers() {
  return [
    { id: 'p1', name: 'Alice', isHost: true },
    { id: 'p2', name: 'Bob', isHost: false },
  ];
}

function threePlayers() {
  return [
    { id: 'p1', name: 'Alice', isHost: true },
    { id: 'p2', name: 'Bob', isHost: false },
    { id: 'p3', name: 'Carol', isHost: false },
  ];
}

function forceCards(state: ServerGameState, playerId: string, cards: [string, string]): ServerGameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id !== playerId ? p : {
        ...p,
        cards: [
          { name: cards[0] as never, revealed: false },
          { name: cards[1] as never, revealed: false },
        ],
      }
    ),
  };
}

// ─── initGame ─────────────────────────────────────────────────────────────────

Deno.test('initGame deals 2 cards and 2 coins to each player', () => {
  const state = initGame(twoPlayers());
  assertEquals(state.players.length, 2);
  for (const p of state.players) {
    assertEquals(p.coins, 2);
    assertEquals(p.cards.length, 2);
    assertEquals(p.cards.every((c) => !c.revealed), true);
  }
});

Deno.test('initGame sets first player as active', () => {
  const state = initGame(twoPlayers());
  assertEquals(state.turnState.currentPlayerId, 'p1');
  assertEquals(state.turnState.phase, 'waiting_for_action');
});

Deno.test('initGame deck has 15 - (2 * players) cards remaining', () => {
  const state2 = initGame(twoPlayers());
  assertEquals(state2.deck.length, 11);
  const state3 = initGame(threePlayers());
  assertEquals(state3.deck.length, 9);
});

// ─── Income ───────────────────────────────────────────────────────────────────

Deno.test('income gives +1 coin and advances turn', () => {
  const state = initGame(twoPlayers());
  const { state: s2, needsReaction } = declareAction(state, 'p1', 'income');
  assertEquals(needsReaction, false);
  assertEquals(s2.players.find((p) => p.id === 'p1')!.coins, 3);
  assertEquals(s2.turnState.currentPlayerId, 'p2');
  assertEquals(s2.turnState.phase, 'waiting_for_action');
});

// ─── Foreign Aid ──────────────────────────────────────────────────────────────

Deno.test('foreign aid opens reaction window', () => {
  const state = initGame(twoPlayers());
  const { state: s2, needsReaction } = declareAction(state, 'p1', 'foreign_aid');
  assertEquals(needsReaction, true);
  assertEquals(s2.turnState.phase, 'waiting_for_reactions');
  assertEquals(s2.turnState.pendingAction, 'foreign_aid');
});

Deno.test('foreign aid resolves with +2 coins when all pass', () => {
  const state = initGame(twoPlayers());
  const { state: s2 } = declareAction(state, 'p1', 'foreign_aid');
  const { state: s3, actionResolved } = applyPass(s2, 'p2');
  assertEquals(actionResolved, true);
  assertEquals(s3.players.find((p) => p.id === 'p1')!.coins, 4);
  assertEquals(s3.turnState.currentPlayerId, 'p2');
});

Deno.test('foreign aid blocked by Duke cancels action', () => {
  let state = initGame(twoPlayers());
  state = forceCards(state, 'p2', ['Duke', 'Contessa']);
  const { state: s2 } = declareAction(state, 'p1', 'foreign_aid');
  const { state: s3 } = applyBlock(s2, 'p2', 'Duke');
  // p1 accepts the block
  const { state: s4, actionResolved } = applyPass(s3, 'p1');
  assertEquals(actionResolved, true);
  assertEquals(s4.players.find((p) => p.id === 'p1')!.coins, 2); // no coins gained
  assertEquals(s4.turnState.currentPlayerId, 'p2'); // turn advanced
});

// ─── Coup ─────────────────────────────────────────────────────────────────────

Deno.test('coup costs 7 coins and puts target in reveal phase', () => {
  let state = initGame(twoPlayers());
  state = { ...state, players: state.players.map((p) => p.id === 'p1' ? { ...p, coins: 7 } : p) };
  const { state: s2, needsReaction } = declareAction(state, 'p1', 'coup', 'p2');
  assertEquals(needsReaction, false);
  assertEquals(s2.players.find((p) => p.id === 'p1')!.coins, 0);
  assertEquals(s2.turnState.phase, 'waiting_for_reveal');
  assertEquals(s2.turnState.revealingPlayerId, 'p2');
});

Deno.test('coup with insufficient coins throws', () => {
  const state = initGame(twoPlayers()); // p1 has 2 coins
  assertThrows(() => declareAction(state, 'p1', 'coup', 'p2'));
});

Deno.test('forced coup at 10+ coins rejects other actions', () => {
  let state = initGame(twoPlayers());
  state = { ...state, players: state.players.map((p) => p.id === 'p1' ? { ...p, coins: 10 } : p) };
  assertThrows(() => declareAction(state, 'p1', 'income'));
});

Deno.test('reveal after coup eliminates player with 1 card left', () => {
  let state = initGame(twoPlayers());
  state = { ...state, players: state.players.map((p) => p.id === 'p1' ? { ...p, coins: 7 } : p) };
  // Give p2 one already-revealed card
  state = {
    ...state,
    players: state.players.map((p) =>
      p.id === 'p2' ? { ...p, cards: [{ name: 'Duke', revealed: true }, { name: 'Contessa', revealed: false }] } : p
    ),
  };
  const { state: s2 } = declareAction(state, 'p1', 'coup', 'p2');
  const { state: s3 } = applyReveal(s2, 'p2', 1); // reveal the unrevealed card
  assertEquals(s3.players.find((p) => p.id === 'p2')!.isEliminated, true);
});

// ─── Tax (Duke) ───────────────────────────────────────────────────────────────

Deno.test('tax gives +3 coins when unchallenged', () => {
  let state = initGame(twoPlayers());
  state = forceCards(state, 'p1', ['Duke', 'Contessa']);
  const { state: s2 } = declareAction(state, 'p1', 'tax');
  const { state: s3 } = applyPass(s2, 'p2');
  assertEquals(s3.players.find((p) => p.id === 'p1')!.coins, 5);
});

// ─── Assassinate ──────────────────────────────────────────────────────────────


// Redo: assassinate requires 3 coins
Deno.test('assassinate requires 3 coins', () => {
  const state = initGame(twoPlayers()); // p1 has 2 coins
  assertThrows(() => declareAction(state, 'p1', 'assassinate', 'p2'));
});

Deno.test('assassinate resolves correctly with 3+ coins', () => {
  let state = initGame(twoPlayers());
  state = { ...state, players: state.players.map((p) => p.id === 'p1' ? { ...p, coins: 5 } : p) };
  state = forceCards(state, 'p1', ['Assassin', 'Duke']);
  const { state: s2 } = declareAction(state, 'p1', 'assassinate', 'p2');
  const { state: s3 } = applyPass(s2, 'p2'); // p2 doesn't block
  assertEquals(s3.players.find((p) => p.id === 'p1')!.coins, 2); // 5 - 3 = 2
  assertEquals(s3.turnState.phase, 'waiting_for_reveal');
  assertEquals(s3.turnState.revealingPlayerId, 'p2');
});

Deno.test('assassinate blocked by Contessa cancels action', () => {
  let state = initGame(twoPlayers());
  state = { ...state, players: state.players.map((p) => p.id === 'p1' ? { ...p, coins: 5 } : p) };
  state = forceCards(state, 'p2', ['Contessa', 'Duke']);
  const { state: s2 } = declareAction(state, 'p1', 'assassinate', 'p2');
  const { state: s3 } = applyBlock(s2, 'p2', 'Contessa');
  const { state: s4, actionResolved } = applyPass(s3, 'p1');
  assertEquals(actionResolved, true);
  // Coins NOT deducted because resolve never ran
  assertEquals(s4.players.find((p) => p.id === 'p1')!.coins, 5);
});

// ─── Steal (Captain) ──────────────────────────────────────────────────────────

Deno.test('steal takes up to 2 coins from target', () => {
  let state = initGame(twoPlayers());
  state = forceCards(state, 'p1', ['Captain', 'Duke']);
  const { state: s2 } = declareAction(state, 'p1', 'steal', 'p2');
  const { state: s3 } = applyPass(s2, 'p2');
  assertEquals(s3.players.find((p) => p.id === 'p1')!.coins, 4); // 2 + 2
  assertEquals(s3.players.find((p) => p.id === 'p2')!.coins, 0); // 2 - 2
});

Deno.test('steal takes only available coins when target has fewer than 2', () => {
  let state = initGame(twoPlayers());
  state = { ...state, players: state.players.map((p) => p.id === 'p2' ? { ...p, coins: 1 } : p) };
  state = forceCards(state, 'p1', ['Captain', 'Duke']);
  const { state: s2 } = declareAction(state, 'p1', 'steal', 'p2');
  const { state: s3 } = applyPass(s2, 'p2');
  assertEquals(s3.players.find((p) => p.id === 'p1')!.coins, 3); // 2 + 1
  assertEquals(s3.players.find((p) => p.id === 'p2')!.coins, 0);
});

Deno.test('steal from player with 0 coins gives nothing', () => {
  let state = initGame(twoPlayers());
  state = { ...state, players: state.players.map((p) => p.id === 'p2' ? { ...p, coins: 0 } : p) };
  state = forceCards(state, 'p1', ['Captain', 'Duke']);
  const { state: s2 } = declareAction(state, 'p1', 'steal', 'p2');
  const { state: s3 } = applyPass(s2, 'p2');
  assertEquals(s3.players.find((p) => p.id === 'p1')!.coins, 2);
  assertEquals(s3.players.find((p) => p.id === 'p2')!.coins, 0);
});

// ─── Ambassador exchange ──────────────────────────────────────────────────────

Deno.test('exchange enters waiting_for_exchange phase', () => {
  let state = initGame(twoPlayers());
  state = forceCards(state, 'p1', ['Ambassador', 'Duke']);
  const { state: s2 } = declareAction(state, 'p1', 'exchange');
  const { state: s3 } = applyPass(s2, 'p2');
  assertEquals(s3.turnState.phase, 'waiting_for_exchange');
  assertEquals(s3.turnState.exchangeCards?.length, 4);
});

Deno.test('applyExchange replaces cards and advances turn', () => {
  let state = initGame(twoPlayers());
  state = forceCards(state, 'p1', ['Ambassador', 'Duke']);
  const { state: s2 } = declareAction(state, 'p1', 'exchange');
  const { state: s3 } = applyPass(s2, 'p2');
  const { state: s4 } = applyExchange(s3, 'p1', [0, 1]);
  assertEquals(s4.players.find((p) => p.id === 'p1')!.cards.filter((c) => !c.revealed).length, 2);
  assertEquals(s4.turnState.currentPlayerId, 'p2');
  assertEquals(s4.turnState.phase, 'waiting_for_action');
});

// ─── Challenge resolution ─────────────────────────────────────────────────────

Deno.test('successful challenge (claimer lied): claimer loses influence, action cancelled', () => {
  let state = initGame(twoPlayers());
  // p1 claims Duke but has no Duke
  state = forceCards(state, 'p1', ['Assassin', 'Contessa']);
  const { state: s2 } = declareAction(state, 'p1', 'tax'); // claims Duke
  const { state: s3, events } = applyChallenge(s2, 'p2');
  // p1 can't prove Duke → loses a card
  const p1 = s3.players.find((p) => p.id === 'p1')!;
  assertEquals(p1.cards.some((c) => c.revealed), true);
  assertEquals(events.some((e) => e.message.includes('challenge succeeds')), true);
});

Deno.test('failed challenge (claimer told truth): game enters waiting_for_reveal for challenger', () => {
  let state = initGame(twoPlayers());
  // p1 genuinely has Duke
  state = forceCards(state, 'p1', ['Duke', 'Contessa']);
  const { state: s2 } = declareAction(state, 'p1', 'tax');
  const { state: s3, events } = applyChallenge(s2, 'p2');
  // Challenge fails → p2 must reveal a card (waiting_for_reveal phase)
  assertEquals(s3.turnState.phase, 'waiting_for_reveal');
  assertEquals(s3.turnState.revealingPlayerId, 'p2');
  assertEquals(events.some((e) => e.message.includes('challenge fails')), true);
  // After p2 reveals, they lose one card
  const { state: s4 } = applyReveal(s3, 'p2', 0);
  const p2 = s4.players.find((p) => p.id === 'p2')!;
  assertEquals(p2.cards.filter((c) => c.revealed).length, 1);
});

// ─── Block challenge ──────────────────────────────────────────────────────────

Deno.test('block challenge: block is false, action proceeds', () => {
  let state = initGame(twoPlayers());
  // p2 claims Duke to block foreign aid, but has no Duke
  state = forceCards(state, 'p2', ['Contessa', 'Captain']);
  const { state: s2 } = declareAction(state, 'p1', 'foreign_aid');
  const { state: s3 } = applyBlock(s2, 'p2', 'Duke');
  const { state: s4, events } = applyChallenge(s3, 'p1');
  // Block busted → foreign aid proceeds → p1 gets +2 coins
  assertEquals(s4.players.find((p) => p.id === 'p1')!.coins, 4);
  assertEquals(events.some((e) => e.message.includes('challenge succeeds')), true);
});

// ─── Win condition ────────────────────────────────────────────────────────────

Deno.test('win detected when only one player remains', () => {
  let state = initGame(twoPlayers());
  state = { ...state, players: state.players.map((p) => p.id === 'p1' ? { ...p, coins: 7 } : p) };
  // Give p2 one card already revealed
  state = {
    ...state,
    players: state.players.map((p) =>
      p.id === 'p2' ? { ...p, cards: [{ name: 'Duke', revealed: true }, { name: 'Captain', revealed: false }] } : p
    ),
  };
  const { state: s2 } = declareAction(state, 'p1', 'coup', 'p2');
  const { state: s3 } = applyReveal(s2, 'p2', 1);
  assertEquals(s3.players.find((p) => p.id === 'p2')!.isEliminated, true);
  assertEquals(s3.turnState.phase, 'game_over');
  assertEquals(s3.winnerId, 'p1');
  assertEquals(s3.winnerName, 'Alice');
});

// ─── toClientGameState ────────────────────────────────────────────────────────

Deno.test('toClientGameState hides other players cards', () => {
  const state = initGame(twoPlayers());
  const clientState = toClientGameState(state, 'p1');
  const p2 = clientState.players.find((p) => p.id === 'p2')!;
  // p2's unrevealed cards should be hidden
  for (const card of p2.cards) {
    if (!card.revealed) {
      assertEquals('name' in card, false);
    }
  }
});

Deno.test('toClientGameState reveals own cards', () => {
  const state = initGame(twoPlayers());
  const clientState = toClientGameState(state, 'p1');
  const p1 = clientState.players.find((p) => p.id === 'p1')!;
  for (const card of p1.cards) {
    assertEquals('name' in card, true);
  }
});

Deno.test('toClientGameState hides exchangeCards from non-exchanging player', () => {
  let state = initGame(twoPlayers());
  state = forceCards(state, 'p1', ['Ambassador', 'Duke']);
  const { state: s2 } = declareAction(state, 'p1', 'exchange');
  const { state: s3 } = applyPass(s2, 'p2');
  const clientForP2 = toClientGameState(s3, 'p2');
  assertEquals(clientForP2.turnState.exchangeCards, undefined);
  const clientForP1 = toClientGameState(s3, 'p1');
  assertMatch(String(clientForP1.turnState.exchangeCards?.length ?? 0), /^4$/);
});
