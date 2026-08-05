import type { AIProfile } from '../types';
import { Twist7State, Player } from '../../engine/types';
import { bustProbability, expectedGain } from '../../lib/probability';
import { TWIST7_DISTINCT_COUNT } from '../../engine/twist7Engine';

function tacticalThreshold(state: Twist7State, me: Player): number {
  const pBust = bustProbability(state, me.distinct);
  const ev = expectedGain(me.distinct) * (1 - pBust);
  if (me.distinct.length >= TWIST7_DISTINCT_COUNT - 1) return 0.55;
  if (ev <= 0) return 0.30;
  return 0.40;
}

export const tactical: AIProfile = {
  maxBustRisk: tacticalThreshold,
  label: 'Tactique',
};
