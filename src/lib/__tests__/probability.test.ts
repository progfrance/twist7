import { describe, it, expect } from 'vitest';
import { bustProbability } from '../probability';
import { createGame } from '../../engine/twist7Engine';
import type { Twist7State } from '../../engine/types';
import { Card } from '../../engine/types';

const setup2 = {
  players: [
    { id: 'a', name: 'A', isAI: false },
    { id: 'b', name: 'B', isAI: false },
  ],
};
const num = (id: string, value: number): Card => ({ id, kind: 'number', value });

function withPool(state: Twist7State, deck: Card[], discard: Card[]): Twist7State {
  return { ...state, deck, discard };
}

describe('bustProbability', () => {
  it('counts duplicates sitting in the discard pile (reshuffled into the draw pile)', () => {
    let s = createGame(setup2);
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0 ? { ...p, row: [num('a5', 5)], distinct: [5] } : p,
      ),
    };
    s = withPool(s, [], [num('x5', 5)]); // only matching card is in the discard
    // Old implementation ignored the discard -> returned 0. Now it must be 1.
    expect(bustProbability(s, [5])).toBeCloseTo(1, 5);
  });

  it('counts cards in deck + discard but excludes cards already in a row', () => {
    let s = createGame(setup2);
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0
          ? { ...p, row: [num('a5', 5)], distinct: [5] }
          : { ...p, row: [num('b7', 7)], distinct: [7] },
      ),
    };
    // deck: one 5 (risky for A) + one 7 (not in A's distinct); B's 7 is in its row
    s = withPool(s, [num('d5', 5), num('d7', 7)], []);
    expect(bustProbability(s, [5])).toBeCloseTo(0.5, 5);
  });

  it('returns 0 when no cards remain', () => {
    const s = withPool(createGame(setup2), [], []);
    expect(bustProbability(s, [5])).toBe(0);
  });
});
