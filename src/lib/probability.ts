import { Twist7State } from '../engine/types';

/** P(next flip duplicates a value already held) = risky cards / remaining. */
export function bustProbability(state: Twist7State, distinct: Set<number>): number {
  const total = state.deck.length;
  if (total === 0) return 0;
  let risky = 0;
  for (const v of distinct) {
    risky += state.deck.filter((c) => c.kind === 'number' && c.value === v).length;
  }
  return risky / total;
}

/** Crude expected marginal gain of one more safe flip. */
export function expectedGain(distinct: Set<number>): number {
  const current = [...distinct].reduce<number>((a, v) => a + v, 0);
  const remaining = Math.max(1, 13 - distinct.size);
  return current / remaining;
}
