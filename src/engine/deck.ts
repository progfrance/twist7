import { Card } from './types';

export interface DeckConfig {
  numberCopies: Record<number, number>;
  modifiers: { plus: number[]; double: number };
  actions: { freeze: number; twistThree: number; secondChance: number };
}

// Number-card counts per the official rulebook (page 1):
//   "Il contient douze 12, onze 11, dix 10... jusqu'à ce que vous arriviez à
//    un 1 ; il y a même un 0."
// i.e. value v has exactly v copies (1 -> 1, 2 -> 2, ... 12 -> 12), plus a
// single 0. That is 1 + (1+2+...+12) = 79 number cards.
function defaultNumberCopies(): Record<number, number> {
  const map: Record<number, number> = { 0: 1 };
  for (let v = 1; v <= 12; v++) map[v] = v;
  return map;
}

// Exact box composition (per the official Twist7 box):
//   - 79 number cards (value v -> v copies, plus one 0)
//   - 6 bonus cards: +2, +4, +6, +8, +10 and a single x2
//   - 9 action cards: 3x Freeze, 3x Second Chance, 3x Twist Three
export const DEFAULT_DECK_CONFIG: DeckConfig = {
  numberCopies: defaultNumberCopies(),
  modifiers: { plus: [2, 4, 6, 8, 10], double: 1 },
  actions: { freeze: 3, twistThree: 3, secondChance: 3 },
};

export function buildDeck(config: DeckConfig = DEFAULT_DECK_CONFIG): Card[] {
  const cards: Card[] = [];
  let seq = 0;

  for (const [valStr, copies] of Object.entries(config.numberCopies)) {
    const value = Number(valStr);
    for (let i = 0; i < copies; i++) {
      cards.push({ id: `n${seq++}`, kind: 'number', value });
    }
  }
  for (const amount of config.modifiers.plus) {
    cards.push({ id: `p${seq++}`, kind: 'modifier', modifier: 'plus', amount });
  }
  for (let i = 0; i < config.modifiers.double; i++) {
    cards.push({ id: `d${seq++}`, kind: 'modifier', modifier: 'double', amount: 2 });
  }
  for (let i = 0; i < config.actions.freeze; i++) {
    cards.push({ id: `f${seq++}`, kind: 'action', action: 'freeze' });
  }
  for (let i = 0; i < config.actions.twistThree; i++) {
    cards.push({ id: `t${seq++}`, kind: 'action', action: 'twistThree' });
  }
  for (let i = 0; i < config.actions.secondChance; i++) {
    cards.push({ id: `s${seq++}`, kind: 'action', action: 'secondChance' });
  }

  return shuffle(cards);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
