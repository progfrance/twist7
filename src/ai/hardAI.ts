import { AIStrategy, AiDecision } from './types';
import { Twist7State, Player } from '../engine/types';
import { bustProbability } from '../lib/probability';
import { remainingNumberCopies } from '../engine/twist7Engine';

const HIGH_VALUES = [8, 9, 10, 11, 12];

/**
 * Hard AI: tracks exact remaining cards, applies opponent score pressure to its
 * risk tolerance, and values the Twist 7 (+15) combo.
 */
export class HardAI implements AIStrategy {
  readonly difficulty = 'hard' as const;

  decide(state: Twist7State): AiDecision {
    const me = state.players[state.currentIndex];
    if (!me || me.roundStatus !== 'active') return 'stay';

    const pBust = bustProbability(state, me.distinct);
    const remainingHigh = this.remainingValues(state, HIGH_VALUES);
    const pressure = this.maxOpponentPressure(state, me);
    const riskTolerance = 0.35 + pressure * 0.3; // ~0.35 -> ~0.65

    // Twist 7 combo: at 6 distinct numbers, the +15 bonus justifies extra risk.
    if (me.distinct.size >= 6) return pBust < 0.6 ? 'take' : 'stay';

    // Dry deck with few high cards left and a weak board -> bank.
    if (remainingHigh <= 1 && me.distinct.size < 5) return 'stay';

    return pBust < riskTolerance ? 'take' : 'stay';
  }

  private remainingValues(state: Twist7State, values: number[]): number {
    let total = 0;
    for (const v of values) total += remainingNumberCopies(state, v);
    return total;
  }

  private maxOpponentPressure(state: Twist7State, me: Player): number {
    const rivals = state.players.filter((p) => p.id !== me.id && p.roundStatus !== 'busted');
    if (rivals.length === 0) return 0;
    const closest = Math.max(...rivals.map((r) => r.bankedScore));
    return Math.min(1, closest / state.targetScore);
  }
}
