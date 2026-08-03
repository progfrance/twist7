import { useI18n } from '../i18n';
import type { Player } from '../engine/types';
import { Card } from './Card';
import { scoreRow } from '../engine/twist7Engine';
import type { Card as CardModel } from '../engine/types';

export type CardSize = 'sm' | 'md';

export const SECOND_CHANCE_CARD: CardModel = {
  id: 'ui-second',
  kind: 'action',
  action: 'secondChance',
};

export const TWIST_THREE_CARD: CardModel = { id: 'ui-twist', kind: 'action', action: 'twistThree' };

export function PlayerBox({
  p,
  index,
  isCurrent,
  cardSize = 'md',
  freezeDrawer = null,
  onFreezeTarget,
  archetype,
}: {
  p: Player;
  index: number;
  isCurrent: boolean;
  cardSize?: CardSize;
  /** When set, the player at this index must choose a Freeze target. */
  freezeDrawer?: number | null;
  /** Called with a player's index to hand them the Freeze. */
  onFreezeTarget?: (i: number) => void;
  archetype?: 'aggressive' | 'tactical' | 'cautious';
}) {
  const { t } = useI18n();
  const visibleCards = p.row;

  // While a Freeze target is being chosen, clickable active opponents are
  // highlighted; the drawer can't freeze themselves.
  const isFreezeTarget = freezeDrawer != null && freezeDrawer !== index && p.roundStatus === 'active';

  const archetypeBorder = p.isAI && archetype
    ? archetype === 'aggressive'
      ? 'border-orange-500/50'
      : archetype === 'tactical'
        ? 'border-emerald-500/50'
        : 'border-slate-400/50'
    : '';

  return (
    <div
      onClick={isFreezeTarget ? () => onFreezeTarget?.(index) : undefined}
      className={`rounded-lg border transition ${
        isCurrent ? 'border-emerald-400 bg-emerald-950/40' : 'border-zinc-800 bg-zinc-900'
      } ${isFreezeTarget ? 'cursor-pointer ring-2 ring-sky-400 hover:bg-sky-950/40' : ''} ${archetypeBorder} p-4`}
    >
      {p.roundStatus === 'frozen' && (
        <div className="mb-2 w-full rounded-md border border-sky-500/40 bg-sky-950/50 px-3 py-1.5 text-center text-sm font-semibold text-sky-200">
          ❄ {t('game.frozen')}
        </div>
      )}
      {p.roundStatus === 'busted' && (
        <div className="mb-2 w-full rounded-md border border-red-500/40 bg-red-950/50 px-3 py-1.5 text-center text-sm font-semibold text-red-300">
          💥 {t('game.bust')}
        </div>
      )}
      {p.roundStatus === 'stayed' && (
        <div className="mb-2 w-full rounded-md border border-emerald-500/40 bg-emerald-950/50 px-3 py-2 text-center">
          <div className="whitespace-nowrap">
            <span className="text-xl font-extrabold leading-none text-emerald-200">✓ {p.roundScore}</span>
            <span className="ml-2 align-middle text-sm font-medium text-emerald-300/80">
              — {t('game.stayed', { name: p.name })}
            </span>
          </div>
          {p.twistSeven && (
            <div className="mt-1 text-xs font-semibold text-emerald-300">
              {t('game.twist7Bonus')}
            </div>
          )}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-100">{p.name}</span>
          {p.isAI && <span className="text-xs text-zinc-500">({t('common.cpu')})</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-bold tabular-nums shadow-sm ${
                p.roundStatus === 'busted'
                  ? 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30'
                  : 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/20'
              }`}
            >
              {t('game.roundScore', { n: scoreRow(p) })}
              {p.twistSeven && <span className="text-[0.6rem] font-extrabold text-emerald-300 uppercase">{t('game.twist7Tag')}</span>}
            </span>
            <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-2.5 py-1 text-sm font-bold tabular-nums text-emerald-200 ring-1 ring-emerald-500/20 shadow-sm">
              {t('game.banked', { n: p.bankedScore })}
            </span>
          </div>
        </div>
      </div>

      <div className="relative">
        {(p.secondChance || p.twistThree) && (
          <div className="mb-2 flex gap-2">
            {p.secondChance && (
              <Card card={SECOND_CHANCE_CARD} size={cardSize} variant="active" />
            )}
            {p.twistThree && (
              <Card card={TWIST_THREE_CARD} size={cardSize} variant="active" />
            )}
          </div>
        )}
        {p.row.length === 0 &&
          p.roundStatus !== 'frozen' &&
          !p.secondChance &&
          !p.twistThree && (
            <span className="text-xs text-zinc-600 opacity-60">—</span>
          )}

        <div
          className="flex flex-wrap items-start gap-2.5 gap-y-3"
        >
          {visibleCards.map((c, idx) => (
            <Card
              key={c.id ?? idx}
              card={c}
              size={cardSize}
              variant={
                p.roundStatus === 'busted'
                  ? 'busted'
                  : p.roundStatus === 'frozen'
                    ? 'frozen'
                    : 'active'
              }
              className="shrink-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
