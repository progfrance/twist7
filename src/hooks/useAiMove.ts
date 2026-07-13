import { useEffect } from 'react';
import { Twist7State } from '../engine/types';
import { getStrategy } from '../ai';

interface UseAiMoveArgs {
  state: Twist7State;
  enabled: boolean;
  onTake: () => void;
  onStay: () => void;
  onResolveSecondChance: (useIt: boolean) => void;
}

/**
 * Drives the active AI player. While enabled and it's the AI's live turn, waits
 * a beat then asks the strategy to take or stay. A pending Second Chance for an
 * AI player is always taken (it saves them from a bust). Forced effects (e.g.
 * Twist Three) are resolved inside the engine, so the effect simply re-evaluates.
 */
export function useAiMove({ state, enabled, onTake, onStay, onResolveSecondChance }: UseAiMoveArgs) {
  useEffect(() => {
    // An AI player holding a pending Second Chance always uses it.
    if (state.pendingSecondChance != null) {
      const p = state.players[state.pendingSecondChance];
      if (p?.isAI) {
        const timer = setTimeout(() => onResolveSecondChance(true), 650);
        return () => clearTimeout(timer);
      }
      return; // human's pending decision: wait for the UI
    }

    if (!enabled) return;
    const player = state.players[state.currentIndex];
    if (!player || player.roundStatus !== 'active') return;

    const timer = setTimeout(() => {
      const strategy = getStrategy(player.difficulty);
      const decision = strategy.decide(state);
      if (decision === 'take') onTake();
      else onStay();
    }, 650);

    return () => clearTimeout(timer);
  }, [state, enabled, onTake, onStay, onResolveSecondChance]);
}
