import type { AIProfile } from '../types';
import { Twist7State } from '../../engine/types';
import { scoreRow } from '../../engine/twist7Engine';

function pickWeakest(state: Twist7State, drawerIdx: number): number {
  let best = drawerIdx;
  let bestScore = Infinity;
  state.players.forEach((p, i) => {
    if (i === drawerIdx || p.roundStatus !== 'active') return;
    const sc = scoreRow(p);
    if (sc < bestScore) { bestScore = sc; best = i; }
  });
  return best;
}

export const aggressive: AIProfile = {
  maxBustRisk: () => 0.65,
  pickFreezeTarget: pickWeakest,
  pickTwistThreeTarget: pickWeakest,
  twistSevenUrgency: 0.9,
  label: 'Agressif',
};
