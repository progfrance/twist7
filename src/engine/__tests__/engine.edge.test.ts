import { describe, it, expect } from 'vitest';
import {
  createGame,
  startRound,
  takeCard,
} from '../twist7Engine';
import { Twist7Setup, Card, Twist7State } from '../types';

const num = (id: string, value: number): Card => ({ id, kind: 'number', value });
const secondChance = (id: string): Card => ({ id, kind: 'action', action: 'secondChance' });
const twistThree = (id: string): Card => ({ id, kind: 'action', action: 'twistThree' });

function withDeck(state: Twist7State, deck: Card[]): Twist7State {
  return { ...state, deck };
}
function withDiscard(state: Twist7State, discard: Card[]): Twist7State {
  return { ...state, discard };
}

const setup3: Twist7Setup = {
  players: [
    { id: 'a', name: 'A', isAI: false },
    { id: 'b', name: 'B', isAI: false },
    { id: 'c', name: 'C', isAI: false },
  ],
};

describe('engine edge cases', () => {
  it('takeCard is a no-op when the phase is not play', () => {
    const s = createGame({ ...setup3, dealerIndex: 0 });
    const before = JSON.stringify(s);
    const after = takeCard(s);
    expect(JSON.stringify(after)).toBe(before);
  });

  it('drawTop reshuffles the discard pile when the deck runs dry', () => {
    let s = createGame({ ...setup3, dealerIndex: 0 });
    s = withDeck(s, []);
    s = withDiscard(s, [num('1', 1), num('2', 2), num('3', 3)]);
    s = startRound(s);
    expect(s.phase).toBe('play');
    // Every player received exactly one card from the reshuffled pool.
    expect(s.players.every((p) => p.row.length === 1)).toBe(true);
    expect(s.discard).toHaveLength(0); // discard was folded back into the deck
  });

  it('takeCard ends the round when both deck and discard are exhausted', () => {
    let s = createGame({ ...setup3, dealerIndex: 0 });
    s = withDeck(s, [num('1', 1), num('2', 2), num('3', 3)]);
    s = startRound(s); // currentIndex = 1
    s = withDeck(s, []);
    s = withDiscard(s, []);
    s = takeCard(s);
    expect(s.phase).toBe('roundEnd');
    expect(s.history).toHaveLength(1);
  });

  it('a second Second Chance is passed to another active player without one', () => {
    let s = createGame({ ...setup3, dealerIndex: 2 }); // currentIndex = 0
    s = withDeck(s, [num('1', 1), num('2', 2), num('3', 3)]);
    s = startRound(s);
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, secondChance: true } : p)) };
    s = withDeck(s, [secondChance('sc2')]);
    s = takeCard(s); // A (already holding SC) draws another Second Chance
    // The new card is handed to the first other active player.
    expect(s.players[0].secondChance).toBe(true);
    expect(s.players[1].secondChance).toBe(true);
    expect(s.players[2].secondChance).toBe(false);
  });

  it('Twist Three stops forcing draws once the target busts', () => {
    let s = createGame({ ...setup3, dealerIndex: 2 }); // currentIndex = 0
    s = withDeck(s, [num('1', 1), num('2', 2), num('3', 3)]);
    s = startRound(s);
    // Tactical (default) targets the strongest opponent by current score:
    // rows are [1],[2],[3] so C (index 2) is the Twist Three target.
    s = withDeck(s, [twistThree('t'), num('x1', 7), num('x2', 3), num('x3', 5)]);
    s = takeCard(s);
    // C draws 7 (safe) then 3 (duplicate of its own 3) -> bust, loop breaks.
    expect(s.players[2].roundStatus).toBe('busted');
    expect(s.players[2].twistThree).toBe(true);
    expect(s.players[2].row.filter((c) => c.kind === 'number')).toHaveLength(3); // [3,7,3]
    expect(s.deck).toHaveLength(1); // the unforced 5 remains
    expect(s.players[0].row).toHaveLength(1); // drawer's row is untouched
  });
});
