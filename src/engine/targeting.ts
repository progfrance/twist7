import { Twist7State } from './types';
import { scoreRow } from './twist7Engine';

/**
 * Select active target by score extreme.
 */
export function targetByScore(state: Twist7State, excludeIdx: number, kind: 'weakest' | 'strongest'): number | null {
  const candidates = state.players
    .map((p, i) => ({ i, p }))
    .filter(({ i, p }) => i !== excludeIdx && p.roundStatus === 'active');

  if (candidates.length === 0) return null;

  let bestIdx = candidates[0].i;
  let bestScore = scoreRow(candidates[0].p);

  for (const { i, p } of candidates.slice(1)) {
    const s = scoreRow(p);
    if (kind === 'weakest' ? s < bestScore : s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }
  return bestIdx;
}
