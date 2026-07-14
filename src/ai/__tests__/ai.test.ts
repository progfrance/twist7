import { describe, it, expect } from 'vitest';
import { EasyAI, MediumAI, HardAI } from '../index';
import { createGame } from '../../engine/twist7Engine';
import type { Difficulty, Twist7State } from '../../engine/types';

// A game where it is player 0's turn and their board is empty (0 points) but
// they are still active. The AI must never choose to "stay" here: staying banks
// 0, whereas taking can only keep them at 0 (on a bust) or improve their score.
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
    expect(new EasyAI().decide(emptyBoardState('easy'))).toBe('take');
  });

  it('medium takes when at 0 points', () => {
    expect(new MediumAI().decide(emptyBoardState('medium'))).toBe('take');
  });

  it('hard takes when at 0 points', () => {
    expect(new HardAI().decide(emptyBoardState('hard'))).toBe('take');
  });
});
