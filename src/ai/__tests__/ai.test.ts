import { describe, it, expect } from 'vitest';
import { decide } from '../engine';
import { createGame } from '../../engine/twist7Engine';
import { expectedGain } from '../../lib/probability';
import type { Twist7State, Card } from '../../engine/types';

function emptyBoardState(archetype: 'aggressive' | 'tactical' | 'cautious'): Twist7State {
  const s = createGame({
    players: [
      { id: 'a', name: 'A', isAI: true, archetype },
      { id: 'b', name: 'B', isAI: true, archetype: 'tactical' },
    ],
  });
  return { ...s, phase: 'play', currentIndex: 0 };
}

describe('AI never stops with an empty board', () => {
  it('aggressive takes when at 0 points', () => {
    expect(decide(emptyBoardState('aggressive'))).toBe('take');
  });
  it('tactical takes when at 0 points', () => {
    expect(decide(emptyBoardState('tactical'))).toBe('take');
  });
  it('cautious takes when at 0 points', () => {
    expect(decide(emptyBoardState('cautious'))).toBe('take');
  });
});

describe('archetype-driven decisions', () => {
  const num = (id: string, value: number): Card => ({ id, kind: 'number', value });

  it('aggressive takes where cautious stays at equal bust risk', () => {
    const make = (archetype: 'aggressive' | 'tactical' | 'cautious'): Twist7State => {
      const s = createGame({ players: [{ id: 'a', name: 'A', isAI: true, archetype }] });
      return {
        ...s,
        phase: 'play',
        currentIndex: 0,
        players: s.players.map((p) =>
          p.id === 'a' ? { ...p, row: [num('a5', 5)], distinct: [5] } : p,
        ),
        deck: [num('d1', 5), num('d2', 7)],
      };
    };
    // pBust = 1/2 = 0.5: aggressive (threshold .65) takes, cautious (.25) stays
    expect(decide(make('aggressive'))).toBe('take');
    expect(decide(make('cautious'))).toBe('stay');
  });

  it('expectedGain grows with the total value of the held distinct cards', () => {
    expect(expectedGain([1, 2, 3])).toBeLessThan(expectedGain([10, 11, 12]));
  });
});
