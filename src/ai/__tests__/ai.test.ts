import { describe, it, expect } from 'vitest';
import { easyDecide, mediumDecide, hardDecide } from '../index';
import { createGame } from '../../engine/twist7Engine';
import type { Difficulty, Twist7State } from '../../engine/types';

function emptyBoardState(difficulty: Difficulty): Twist7State {
  const s = createGame({
    players: [
      { id: 'a', name: 'A', isAI: true, difficulty },
      { id: 'b', name: 'B', isAI: true, difficulty: 'medium' },
    ],
  });
  return { ...s, phase: 'play', currentIndex: 0 };
}

describe('AI never stops with an empty board', () => {
  it('easy takes when at 0 points', () => {
    expect(easyDecide(emptyBoardState('easy'))).toBe('take');
  });

  it('medium takes when at 0 points', () => {
    expect(mediumDecide(emptyBoardState('medium'))).toBe('take');
  });

  it('hard takes when at 0 points', () => {
    expect(hardDecide(emptyBoardState('hard'))).toBe('take');
  });
});
