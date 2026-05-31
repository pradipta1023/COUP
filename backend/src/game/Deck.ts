import type { CardName } from '@shared/types.ts';

// Standard Coup deck: 3 copies of each of the 5 roles = 15 cards
const DECK_COMPOSITION: CardName[] = [
  'Duke', 'Duke', 'Duke',
  'Assassin', 'Assassin', 'Assassin',
  'Captain', 'Captain', 'Captain',
  'Ambassador', 'Ambassador', 'Ambassador',
  'Contessa', 'Contessa', 'Contessa',
];

export function buildDeck(): CardName[] {
  return [...DECK_COMPOSITION];
}

export function shuffle(deck: CardName[]): CardName[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function drawCard(deck: CardName[]): { card: CardName; remaining: CardName[] } | null {
  if (deck.length === 0) return null;
  const [card, ...remaining] = deck;
  return { card, remaining };
}

export function returnAndShuffle(deck: CardName[], card: CardName): CardName[] {
  return shuffle([...deck, card]);
}
