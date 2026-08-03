import type { AiDecision } from './types';
import { Twist7State, Player } from '../engine/types';
import { bustProbability } from '../lib/probability';
import { remainingNumberCopies, scoreRow, TWIST7_DISTINCT_COUNT } from '../engine/twist7Engine';

const HIGH_VALUES = [8, 9, 10, 11, 12];

function remainingValues(state: Twist7State, values: number[]): number {
  let total = 0;
  for (const v of values) total += remainingNumberCopies(state, v);
  return total;
}

function maxOpponentPressure(state: Twist7State, me: Player): number {
  const rivals = state.players.filter((p) => p.id !== me.id && p.roundStatus !== 'busted');
  if (rivals.length === 0) return 0;
  const closest = Math.max(...rivals.map((r) => r.bankedScore));
  return Math.min(1, closest / state.targetScore);
}

/**
 * Hard AI: tracks exact remaining cards, applies opponent score pressure to its
 * risk tolerance, and values the Twist 7 (+15) combo.
 */
export function hardDecide(state: Twist7State): AiDecision {
  const me = state.players[state.currentIndex];
  if (!me || me.roundStatus !== 'active') return 'stay';
  // Never stop with nothing on the board — taking can only improve (or tie at 0).
  if (scoreRow(me) === 0) return 'take';

  const pBust = bustProbability(state, me.distinct);
  const remainingHigh = remainingValues(state, HIGH_VALUES);
  const pressure = maxOpponentPressure(state, me);
  const riskTolerance = 0.35 + pressure * 0.3; // ~0.35 -> ~0.65

  // Twist 7 combo: one distinct number away from the +15 bonus justifies extra risk.
  if (me.distinct.length >= TWIST7_DISTINCT_COUNT - 1) return pBust < 0.6 ? 'take' : 'stay';

  // Dry deck with few high cards left and a weak board -> bank.
  if (remainingHigh <= 1 && me.distinct.length < 5) return 'stay';

  return pBust < riskTolerance ? 'take' : 'stay';
}
