import { createFileRoute, useParams, useLocation, Link } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { useTwist7Game } from '../hooks/useTwist7Game';
import { useAiMove } from '../hooks/useAiMove';
import { useI18n } from '../i18n';
import { Card } from '../components/Card';
import { DeckPile } from '../components/DeckPile';
import { ScoreTable } from '../components/ScoreTable';
import type { Difficulty } from '../ai';
import type { Card as CardModel, Twist7Setup, Player } from '../engine/types';
import { scoreRow } from '../engine/twist7Engine';

export const Route = createFileRoute('/game/$mode')({
  component: GameView,
});

function defaultSetup(mode: string): Twist7Setup {
  const difficulty: Difficulty =
    mode === 'easy' || mode === 'medium' || mode === 'hard' ? mode : 'medium';
  return {
    players: [
      { id: 'human', name: 'You', isAI: false },
      { id: 'ai', name: 'CPU', isAI: true, difficulty },
    ],
  };
}

type CardSize = 'sm' | 'md';

const SECOND_CHANCE_CARD: CardModel = {
  id: 'ui-second',
  kind: 'action',
  action: 'secondChance',
};

const TWIST_THREE_CARD: CardModel = { id: 'ui-twist', kind: 'action', action: 'twistThree' };

function PlayerBox({
  p,
  index,
  isCurrent,
  cardSize = 'md',
  freezeDrawer = null,
  onFreezeTarget,
}: {
  p: Player;
  index: number;
  isCurrent: boolean;
  cardSize?: CardSize;
  /** When set, the player at this index must choose a Freeze target. */
  freezeDrawer?: number | null;
  /** Called with a player's index to hand them the Freeze. */
  onFreezeTarget?: (i: number) => void;
}) {
  const { t } = useI18n();
  const visibleCards = p.row;

  // While a Freeze target is being chosen, clickable active opponents are
  // highlighted; the drawer can't freeze themselves.
  const isFreezeTarget = freezeDrawer != null && freezeDrawer !== index && p.roundStatus === 'active';

  return (
    <div
      onClick={isFreezeTarget ? () => onFreezeTarget?.(index) : undefined}
      className={`rounded-lg border transition ${
        isCurrent ? 'border-emerald-400 bg-emerald-950/40' : 'border-zinc-800 bg-zinc-900'
      } ${isFreezeTarget ? 'cursor-pointer ring-2 ring-sky-400 hover:bg-sky-950/40' : ''} p-4`}
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
          <div className="flex flex-col items-end gap-1">
            <span
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
                p.roundStatus === 'busted'
                  ? 'bg-red-500/15 text-red-300'
                  : 'bg-amber-500/15 text-amber-300'
              }`}
            >
              {t('game.roundScore', { n: scoreRow(p) })}
              {p.twistSeven && <span className="text-[0.65rem] text-emerald-300">{t('game.twist7Tag')}</span>}
            </span>
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-300">
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
          className="flex flex-wrap items-start gap-2 gap-y-2.5"
          style={{ maxWidth: cardSize === 'sm' ? 240 : 520 }}
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

function GameView() {
  const { mode } = useParams({ from: '/game/$mode' });
  const { state: navState } = useLocation();
  const { t } = useI18n();

  const setup = useMemo<Twist7Setup>(() => {
    const incoming = (navState as { players?: Twist7Setup['players'] } | null)?.players;
    if (incoming && incoming.length >= 2) return { players: incoming };
    return defaultSetup(mode);
  }, [navState, mode]);

  const { state, take, stay, startRound, nextRound, resolveSecondChance, resolveFreeze } = useTwist7Game(setup);

  const active = state.players[state.currentIndex];
  const activeIsHuman =
    !!active && !active.isAI && active.roundStatus === 'active';

  const pending = state.pendingSecondChance;
  const pendingPlayer = pending != null ? state.players[pending] : null;
  const pendingIsHuman = !!pendingPlayer && !pendingPlayer.isAI;

  const freezeDrawer = state.pendingFreeze;
  const freezeDrawerPlayer = freezeDrawer != null ? state.players[freezeDrawer] : null;

  useEffect(() => {
    if (state.phase === 'setup') startRound();
  }, [state.phase, startRound]);

  useAiMove({
    state,
    enabled:
      state.phase === 'play' &&
      !!active &&
      active.isAI &&
      active.roundStatus === 'active' &&
      state.pendingSecondChance == null,
    onTake: take,
    onStay: stay,
    onResolveSecondChance: resolveSecondChance,
  });

  useEffect(() => {
    if (state.phase === 'roundEnd' && state.players.every((p) => p.isAI)) {
      const id = setTimeout(() => nextRound(), 800);
      return () => clearTimeout(id);
    }
  }, [state.phase, state.players, nextRound]);

  if (state.phase === 'gameOver') {
    const winner = state.players.find((p) => p.id === state.winnerId);
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-emerald-400">{t('game.winner', { name: winner?.name ?? '?' })}</h1>
        <p className="mt-2 text-zinc-300">{t('game.winDetail', { target: state.targetScore })}</p>
        <div className="mx-auto mt-4 max-w-md">
          <ScoreTable players={state.players} history={state.history} />
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <Link to="/" className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-200">
            {t('game.menu')}
          </Link>
          <Link to="/" className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white">
            {t('game.playAgain')}
          </Link>
        </div>
      </div>
    );
  }

  const n = state.players.length;

  // Smaller cards once there are 3+ players so the grid stays readable
  const cardSize: CardSize = n >= 3 ? 'sm' : 'md';

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <div className="mb-5 flex items-center justify-between">
        <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← {t('game.menu')}
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <main className="min-w-0 flex-1">
          <div className="relative">
            {n === 2 ? (
              <div className="flex flex-col gap-6">
                <div className="flex justify-center">
                  <DeckPile count={state.deck.length} label={t('game.deck')} />
                </div>
                <div className="flex flex-col gap-6 lg:flex-row">
                  {state.players.map((p, i) => (
                    <div key={p.id} className="flex-1 min-w-0">
                      <PlayerBox
                        p={p}
                        index={i}
                        isCurrent={i === state.currentIndex && state.phase === 'play'}
                        cardSize={cardSize}
                        freezeDrawer={freezeDrawer}
                        onFreezeTarget={resolveFreeze}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex justify-center">
                  <DeckPile count={state.deck.length} label={t('game.deck')} />
                </div>
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
                >
                  {state.players.map((p, i) => (
                    <PlayerBox
                      key={p.id}
                      p={p}
                      index={i}
                      isCurrent={i === state.currentIndex && state.phase === 'play'}
                      cardSize={cardSize}
                      freezeDrawer={freezeDrawer}
                      onFreezeTarget={resolveFreeze}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

        </main>

        <aside className="lg:w-96 lg:shrink-0 flex flex-col gap-4">
          {/* Round + dealer */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-3xl font-extrabold leading-none text-emerald-300">
              {t('game.round', { n: state.roundNumber })}
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              {t('game.dealer', { name: state.players[state.dealerIndex]?.name ?? '?' })}
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              {t('game.target', { n: state.targetScore })}
            </div>
          </div>

          {/* Control panel */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            {state.pendingSecondChance != null && (
              pendingIsHuman ? (
                <div className="w-full rounded-lg border border-teal-500/50 bg-teal-950/40 p-4 text-center">
                  <p className="mb-3 text-sm text-teal-200">
                    {t('game.secondChancePrompt', { name: pendingPlayer!.name })}
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => resolveSecondChance(true)}
                      className="rounded-md bg-teal-600 px-4 py-2 font-semibold text-white"
                    >
                      {t('game.useSecondChance')}
                    </button>
                    <button
                      onClick={() => resolveSecondChance(false)}
                      className="rounded-md bg-rose-700 px-4 py-2 font-semibold text-white"
                    >
                      {t('game.takeBust')}
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-zinc-400">
                  {t('game.waiting', { name: pendingPlayer!.name })}
                </span>
              )
            )}

            {state.pendingFreeze != null && (
              <div className="w-full rounded-lg border border-sky-500/50 bg-sky-950/40 p-4 text-center">
                <p className="mb-1 text-sm font-semibold text-sky-200">
                  {t('game.freezePrompt', { name: freezeDrawerPlayer!.name })}
                </p>
                <p className="mb-3 text-xs text-zinc-400">{t('game.freezeHint')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {state.players.map((p, i) =>
                    i !== state.pendingFreeze && p.roundStatus === 'active' ? (
                      <button
                        key={p.id}
                        onClick={() => resolveFreeze(i)}
                        className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-500"
                      >
                        {t('game.freezeTarget', { name: p.name })}
                      </button>
                    ) : null,
                  )}
                </div>
              </div>
            )}

            {state.phase === 'play' && active && state.pendingSecondChance == null && state.pendingFreeze == null && (
              <div className="flex flex-col items-center gap-3">
                <span className="text-sm text-zinc-400">
                  {activeIsHuman
                    ? t('game.yourTurn')
                    : t('game.waiting', { name: active.name })}
                </span>
                {activeIsHuman && (
                  <div className="flex gap-3">
                    <button
                      onClick={take}
                      className="rounded-md bg-emerald-600 px-5 py-2.5 font-semibold text-white"
                    >
                      {t('game.take')}
                    </button>
                    <button
                      onClick={stay}
                      className="rounded-md bg-amber-600 px-5 py-2.5 font-semibold text-white"
                    >
                      {t('game.stay')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {state.phase === 'roundEnd' && (
              <button
                onClick={nextRound}
                className="w-full rounded-md bg-emerald-600 px-4 py-2.5 font-semibold text-white"
              >
                {t('game.nextRound')}
              </button>
            )}
          </div>

          <ScoreTable players={state.players} history={state.history} />
        </aside>
      </div>
    </div>
  );
}