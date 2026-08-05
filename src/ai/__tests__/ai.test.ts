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

describe('twist-7 urgency', () => {
  const num = (id: string, value: number): Card => ({ id, kind: 'number', value });

  it('near a Flip 7, aggressive takes where cautious stays', () => {
    const make = (archetype: 'aggressive' | 'tactical' | 'cautious'): Twist7State => {
      const s = createGame({ players: [{ id: 'a', name: 'A', isAI: true, archetype }] });
      return {
        ...s,
        phase: 'play',
        currentIndex: 0,
        players: s.players.map((p) =>
          p.id === 'a'
            ? {
                ...p,
                row: [num('a1', 1), num('a2', 2), num('a3', 3), num('a4', 4), num('a5', 5), num('a6', 6)],
                distinct: [1, 2, 3, 4, 5, 6],
              }
            : p,
        ),
        // 8 copies of a held value + 2 safe cards => pBust = 0.8
        deck: [
          ...Array.from({ length: 8 }, (_, k) => ({ id: `d${k}`, kind: 'number' as const, value: 1 })),
          ...Array.from({ length: 2 }, (_, k) => ({ id: `e${k}`, kind: 'number' as const, value: 7 })),
        ],
      };
    };
    expect(decide(make('aggressive'))).toBe('take'); // 0.65 + 0.9 = 1.55 >= 0.8
    expect(decide(make('cautious'))).toBe('stay'); // 0.45 + 0.3 = 0.75 < 0.8
  });
});
