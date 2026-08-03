import { describe, it, expect } from 'vitest';
import { decide } from '../engine';
import { createGame } from '../../engine/twist7Engine';
import type { Twist7State } from '../../engine/types';

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
