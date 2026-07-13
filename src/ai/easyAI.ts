import { AIStrategy, AiDecision } from './types';
import { Twist7State } from '../engine/types';

/** Easy AI: reckless — takes on a fixed random threshold, ignoring bust odds. */
export class EasyAI implements AIStrategy {
  readonly difficulty = 'easy' as const;

  decide(_state: Twist7State): AiDecision {
    return Math.random() < 0.7 ? 'take' : 'stay';
  }
}
