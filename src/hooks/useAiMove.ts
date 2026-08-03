import { useEffect } from 'react';
import { Twist7State } from '../engine/types';
import { easyDecide, mediumDecide, hardDecide } from '../ai';

interface UseAiMoveArgs {
  state: Twist7State;
  enabled: boolean;
  onTake: () => void;
  onStay: () => void;
  onResolveSecondChance: (useIt: boolean) => void;
}

const DECIDE_MAP = { easy: easyDecide, medium: mediumDecide, hard: hardDecide } as const;

export function useAiMove({ state, enabled, onTake, onStay, onResolveSecondChance }: UseAiMoveArgs) {
  useEffect(() => {
    if (state.pendingSecondChance != null) {
      const p = state.players[state.pendingSecondChance];
      if (p?.isAI) {
        const timer = setTimeout(() => onResolveSecondChance(true), 650);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (!enabled) return;
    const player = state.players[state.currentIndex];
    if (!player || player.roundStatus !== 'active') return;

    const timer = setTimeout(() => {
      const decide = DECIDE_MAP[player.difficulty];
      const decision = decide(state);
      if (decision === 'take') onTake();
      else onStay();
    }, 650);

    return () => clearTimeout(timer);
  }, [state, enabled, onTake, onStay, onResolveSecondChance]);
}
