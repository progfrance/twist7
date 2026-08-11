import { Twist7State } from '../engine/types';

/**
 * P(next flip duplicates a value already held) = risky cards / remaining.
 *
 * The discard pile is reshuffled into the draw pile by `drawTop`, so any card
 * still in play can come from either the deck or the discard — both count as the
 * unseen pool. Cards already sitting in players' rows are naturally excluded
 * because they are no longer in that pool.
 */
export function bustProbability(state: Twist7State, distinct: number[]): number {
  const pool = [...state.deck, ...state.discard];
  const total = pool.length;
  if (total === 0) return 0;
  // Build count map once for numbers in pool
  const counts = new Map<number, number>();
  for (const c of pool) {
    if (c.kind === 'number') {
      counts.set(c.value, (counts.get(c.value) ?? 0) + 1);
    }
  }
  let risky = 0;
  for (const v of distinct) {
    risky += counts.get(v) ?? 0;
  }
  return risky / total;
}

/** Crude expected marginal gain of one more safe flip. */
export function expectedGain(distinct: number[]): number {
  const current = [...distinct].reduce<number>((a, v) => a + v, 0);
  const remaining = Math.max(1, 13 - distinct.length);
  return current / remaining;
}
