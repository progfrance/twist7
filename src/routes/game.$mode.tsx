import { createFileRoute, useParams, useLocation, Link } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { useTwist7Game } from '../hooks/useTwist7Game';
import { useAiMove } from '../hooks/useAiMove';
import { useI18n } from '../i18n';
import { GameHub } from '../components/GameHub';
import { ScoreTable } from '../components/ScoreTable';
import { PlayerBox, type CardSize } from '../components/PlayerBox';
import type { Difficulty } from '../engine/types';
import type { Twist7Setup } from '../engine/types';

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

  // Grid columns: 2 for 2-3 players, 3 for 4-6
  const gridCols = n <= 3 ? 2 : 3;

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <div className="mb-5 flex items-center justify-between">
        <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← {t('game.menu')}
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <main className="min-w-0 flex-1">
          <div className="flex flex-col items-center gap-6">
            {/* Players around the hub */}
            <div
              className={`w-full ${n === 2 ? 'flex flex-col gap-4' : 'grid gap-5'}`}
              style={n >= 3 ? { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` } : undefined}
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
                  archetype={(p as any).archetype}
                />
              ))}
            </div>
          </div>
        </main>

        <aside className="lg:w-[420px] lg:shrink-0 flex flex-col gap-4">
          {/* Game hub: deck + round info */}
          <GameHub state={state} />

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
