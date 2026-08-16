import { describe, it, expect } from 'vitest';
import { createGame, startRound, takeCard, nextRound } from '../twist7Engine';
import { Twist7Setup, Card, Twist7State } from '../types';

const num = (id: string, value: number): Card => ({ id, kind: 'number', value });

function withDeck(state: Twist7State, deck: Card[]): Twist7State {
  return { ...state, deck };
}

const setup3: Twist7Setup = {
  players: [
    { id: 'a', name: 'A', isAI: false },
    { id: 'b', name: 'B', isAI: false },
    { id: 'c', name: 'C', isAI: false },
  ],
};

describe('engine edge cases', () => {
  it('game starts with correct dealer index', () => {
    const s = createGame({ ...setup3, dealerIndex: 2 });
    expect(s.dealerIndex).toBe(2);
  });

  it('takeCard does nothing when phase is not play', () => {
    let s = createGame({ ...setup3, dealerIndex: 0 });
    const before = JSON.stringify(s);
    s = takeCard(s);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('startRound sets phase to play', () => {
    let s = createGame({ ...setup3, dealerIndex: 0 });
    s = withDeck(s, [num('1',1), num('2',2), num('3',3)]);
    s = startRound(s);
    expect(s.phase).toBe('play');
  });

  it('nextRound can be called without error', () => {
    let s = createGame({ ...setup3, dealerIndex: 0 });
    s = withDeck(s, [num('1',1), num('2',2), num('3',3)]);
    s = startRound(s);
    expect(() => nextRound(s)).not.toThrow();
  });
});
