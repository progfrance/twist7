import { Twist7State } from '../engine/types';
import { bustProbability } from '../lib/probability';
import { scoreRow, TWIST7_DISTINCT_COUNT } from '../engine/twist7Engine';
import { aggressive } from './profiles/aggressive';
import { tactical } from './profiles/tactical';
import { cautious } from './profiles/cautious';
import type { AIProfile } from './types';

const PROFILES: Record<string, AIProfile> = { aggressive, tactical, cautious };

export function decide(state: Twist7State): 'take' | 'stay' {
  const me = state.players[state.currentIndex];
  if (!me || me.roundStatus !== 'active') return 'stay';
  if (scoreRow(me) === 0) return 'take';

  const archetype = (me as any).archetype ?? 'tactical';
  const profile = PROFILES[archetype] ?? tactical;

  const pBust = bustProbability(state, me.distinct);
  const threshold = profile.maxBustRisk(state, me);
  const adjusted = me.distinct.length >= TWIST7_DISTINCT_COUNT - 1 ? threshold + 0.15 : threshold;

  return pBust < adjusted ? 'take' : 'stay';
}
