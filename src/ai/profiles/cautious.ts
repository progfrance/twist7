import type { AIProfile } from '../types';
import { Twist7State, Player } from '../../engine/types';
import { remainingNumberCopies, scoreRow, TWIST7_DISTINCT_COUNT } from '../../engine/twist7Engine';

const HIGH_VALUES = [8, 9, 10, 11, 12];

function pickStrongest(state: Twist7State, drawerIdx: number): number {
  let best = drawerIdx;
  let bestScore = -1;
  state.players.forEach((p, i) => {
    if (i === drawerIdx || p.roundStatus !== 'active') return;
    const sc = scoreRow(p);
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  return best;
}

function cautiousThreshold(state: Twist7State, me: Player): number {
  let total = 0;
  for (const v of HIGH_VALUES) total += remainingNumberCopies(state, v);
  if (total <= 1 && me.distinct.length < 5) return 0.15;
  if (me.distinct.length >= TWIST7_DISTINCT_COUNT - 1) return 0.45;
  return 0.25;
}

export const cautious: AIProfile = {
  maxBustRisk: cautiousThreshold,
  pickFreezeTarget: pickStrongest,
  pickTwistThreeTarget: (_state, idx) => idx, // never force others
  twistSevenUrgency: 0.3,
  label: 'Prudent',
};
