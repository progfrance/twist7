import type { Twist7Setup } from '../engine/types';
import type { Archetype } from '../ai/types';

/**
 * Build a default 1-human vs 1-CPU setup for a given game mode.
 *
 * The route param historically carried a "difficulty" (easy/medium/hard) but the
 * AI engine is driven by the per-player `archetype` (aggressive/tactical/cautious).
 * We map the mode straight to an archetype so a direct URL such as
 * `/game/aggressive` produces the expected opponent behaviour. Unknown modes fall
 * back to the default "tactical" archetype.
 */
export function defaultSetup(mode: string): Twist7Setup {
  const archetype: Archetype =
    mode === 'aggressive' || mode === 'tactical' || mode === 'cautious'
      ? (mode as Archetype)
      : 'tactical';
  return {
    players: [
      { id: 'human', name: 'You', isAI: false },
      { id: 'ai', name: 'CPU', isAI: true, archetype },
    ],
  };
}
