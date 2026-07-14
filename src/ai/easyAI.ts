import { AIStrategy, AiDecision } from './types';
import { Twist7State } from '../engine/types';
import { scoreRow } from '../engine/twist7Engine';

/** Easy AI: reckless — takes on a fixed random threshold, ignoring bust odds. */
export class EasyAI implements AIStrategy {
  readonly difficulty = 'easy' as const;

  decide(state: Twist7State): AiDecision {
    const me = state.players[state.currentIndex];
    if (!me || me.roundStatus !== 'active') return 'stay';
    // Never stop with nothing on the board — taking can only improve (or tie at 0).
    if (scoreRow(me) === 0) return 'take';
    return Math.random() < 0.7 ? 'take' : 'stay';
  }
}
