import type { Archetype } from './types';

/**
 * Archetype → opponent-selection intent for the disruptive action cards.
 *
 * Kept in its own module that depends only on the `Archetype` *type* (erased at
 * runtime) so the pure engine can read it without creating a circular
 * engine ↔ ai import (the ai layer otherwise imports `scoreRow` from the engine).
 */
export type FreezeTargetKind = 'weakest' | 'strongest';
export type TwistTargetKind = 'weakest' | 'strongest' | 'self';

export const PROFILE_BEHAVIOR: Record<
  Archetype,
  { freezeTarget: FreezeTargetKind; twistThreeTarget: TwistTargetKind; twistSevenUrgency: number }
> = {
  // Aggressive: hurt the weakest opponent, never spare them.
  aggressive: { freezeTarget: 'weakest', twistThreeTarget: 'weakest', twistSevenUrgency: 0.9 },
  // Tactical: cripple the leader.
  tactical: { freezeTarget: 'strongest', twistThreeTarget: 'strongest', twistSevenUrgency: 0.6 },
  // Cautious: avoid collateral damage — take Twist Three draws on itself.
  cautious: { freezeTarget: 'strongest', twistThreeTarget: 'self', twistSevenUrgency: 0.3 },
};
