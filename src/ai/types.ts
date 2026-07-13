import { Twist7State } from '../engine/types';
import type { Difficulty } from '../engine/types';

export type AiDecision = 'take' | 'stay';
export type { Difficulty };

export interface AIStrategy {
  readonly difficulty: Difficulty;
  /** Given the full game state, decide whether the active AI player takes or stays. */
  decide(state: Twist7State): AiDecision;
}
