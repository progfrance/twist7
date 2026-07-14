import { AIStrategy, AiDecision } from './types';
import { Twist7State } from '../engine/types';
import { bustProbability, expectedGain } from '../lib/probability';
import { scoreRow } from '../engine/twist7Engine';

/** Medium AI: takes while expected value is positive and bust risk is tolerable. */
export class MediumAI implements AIStrategy {
  readonly difficulty = 'medium' as const;

  decide(state: Twist7State): AiDecision {
    const turn = state.players[state.currentIndex];
    if (!turn || turn.roundStatus !== 'active') return 'stay';
    // Never stop with nothing on the board — taking can only improve (or tie at 0).
    if (scoreRow(turn) === 0) return 'take';

    const pBust = bustProbability(state, turn.distinct);
    const ev = expectedGain(turn.distinct) * (1 - pBust);

    return ev > 0 && pBust < 0.45 ? 'take' : 'stay';
  }
}
