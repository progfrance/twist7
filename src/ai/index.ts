import { AIStrategy, Difficulty } from './types';
import { EasyAI } from './easyAI';
import { MediumAI } from './mediumAI';
import { HardAI } from './hardAI';

export function getStrategy(difficulty: Difficulty): AIStrategy {
  switch (difficulty) {
    case 'easy':
      return new EasyAI();
    case 'medium':
      return new MediumAI();
    case 'hard':
      return new HardAI();
  }
}

export type { AIStrategy, Difficulty, AiDecision } from './types';
