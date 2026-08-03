import { DeckPile } from './DeckPile';
import type { Twist7State } from '../engine/types';
import { useI18n } from '../i18n';

interface GameHubProps {
  state: Twist7State;
}

export function GameHub({ state }: GameHubProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Deck pile — the visual centerpiece */}
      <div className="relative">
        <DeckPile count={state.deck.length} label={t('game.deck')} />
        {/* Subtle pulse when it's a human's turn */}
        {state.phase === 'play' && !state.players[state.currentIndex]?.isAI && (
          <div className="absolute -inset-2 rounded-xl border-2 border-emerald-400/30 animate-pulse" />
        )}
      </div>

      {/* Round info panel */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-center">
        <div className="text-2xl font-extrabold text-emerald-300">
          {t('game.round', { n: state.roundNumber })}
        </div>
        <div className="mt-1 text-xs text-zinc-400">
          {t('game.dealer', { name: state.players[state.dealerIndex]?.name ?? '?' })}
        </div>
        <div className="text-xs text-zinc-500">
          {t('game.target', { n: state.targetScore })}
        </div>
      </div>
    </div>
  );
}
