import { DeckPile } from './DeckPile';
import type { Twist7State } from '../engine/types';
import { useI18n } from '../i18n';

interface GameHubProps {
  state: Twist7State;
}

export function GameHub({ state }: GameHubProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-center gap-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      {/* Left: round info */}
      <div className="flex flex-col items-end gap-1 text-right">
        <div className="text-2xl font-extrabold text-emerald-300 leading-none">
          {t('game.round', { n: state.roundNumber })}
        </div>
        <div className="text-xs text-zinc-400">
          {t('game.dealer', { name: state.players[state.dealerIndex]?.name ?? '?' })}
        </div>
        <div className="text-xs text-zinc-500">
          {t('game.target', { n: state.targetScore })}
        </div>
      </div>

      {/* Right: deck pile with subtle offset */}
      <div className="relative shrink-0" style={{ transform: 'rotate(-3deg) translateX(4px)' }}>
        <DeckPile count={state.deck.length} label={t('game.deck')} />
        {state.phase === 'play' && !state.players[state.currentIndex]?.isAI && (
          <div className="absolute -inset-2 rounded-xl border-2 border-emerald-400/30 animate-pulse" />
        )}
      </div>
    </div>
  );
}
