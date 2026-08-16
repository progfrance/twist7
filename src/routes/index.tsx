import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useI18n } from '../i18n';
type Archetype = 'aggressive' | 'tactical' | 'cautious';

export const Route = createFileRoute('/')({
  component: Setup,
});

interface PlayerSetup {
  id: string;
  name: string;
  isAI: boolean;
  archetype: Archetype;
}

const ARCHETYPES: { value: Archetype; labelKey: string }[] = [
  { value: 'aggressive', labelKey: 'archetype.aggressive' },
  { value: 'tactical', labelKey: 'archetype.tactical' },
  { value: 'cautious', labelKey: 'archetype.cautious' },
];

function Setup() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<PlayerSetup[]>([
    { id: 'p1', name: t('common.you'), isAI: false, archetype: 'tactical' },
    { id: 'p2', name: t('setup.player', { n: 2 }), isAI: true, archetype: 'tactical' },
  ]);

  const update = (id: string, patch: Partial<PlayerSetup>) =>
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addPlayer = () =>
    setPlayers((ps) =>
      ps.length < 6
        ? [
            ...ps,
            {
              id: `p${ps.length + 1}`,
              name: t('setup.player', { n: ps.length + 1 }),
              isAI: true,
              archetype: 'tactical',
            },
          ]
        : ps,
    );

  const removePlayer = (id: string) =>
    setPlayers((ps) => (ps.length > 2 ? ps.filter((p) => p.id !== id) : ps));

  const start = () => {
    const firstAI = players.find((p) => p.isAI);
    const mode = firstAI?.archetype ?? 'tactical';
    // `players` is custom history state read back in game.$mode.tsx. TanStack
    // Router only types the standard history state, so the field is cast locally;
    // `to`/`params` above remain fully type-checked.
    navigate({ to: '/game/$mode', params: { mode }, state: { players } as never });
  };

  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-3xl font-bold text-emerald-400">{t('app.title')}</h1>
      <p className="mt-2 text-zinc-400">{t('app.subtitle')}</p>

      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-semibold text-zinc-100">{t('setup.heading')}</h2>
        <p className="mb-3 text-sm text-zinc-500">{t('setup.numPlayers')}: {players.length}</p>

        <div className="space-y-3">
          {players.map((p, i) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 p-2"
            >
              <span className="w-20 text-sm text-zinc-400">
                {t('setup.player', { n: i + 1 })}
              </span>
              <input
                value={p.name}
                onChange={(e) => update(p.id, { name: e.target.value })}
                className="w-28 rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-emerald-500"
                aria-label={t('setup.name')}
              />
              <select
                value={p.isAI ? 'ai' : 'human'}
                onChange={(e) =>
                  update(p.id, { isAI: e.target.value === 'ai' })
                }
                className="rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
                aria-label={t('setup.type')}
              >
                <option value="human">{t('setup.human')}</option>
                <option value="ai">{t('setup.ai')}</option>
              </select>
              {p.isAI && (
                <select
                  value={p.archetype}
                  onChange={(e) =>
                    update(p.id, { archetype: e.target.value as Archetype })
                  }
                  className="rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
                  aria-label={t('setup.archetype')}
                >
                  {ARCHETYPES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {t(a.labelKey)}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => removePlayer(p.id)}
                disabled={players.length <= 2}
                className="ml-auto rounded bg-red-900/70 px-2 py-1 text-xs text-red-200 disabled:opacity-30"
              >
                {t('setup.removePlayer')}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={addPlayer}
            disabled={players.length >= 6}
            className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-30"
          >
            + {t('setup.addPlayer')}
          </button>
          <button
            onClick={start}
            className="ml-auto rounded-md bg-emerald-600 px-4 py-1.5 font-semibold text-white"
          >
            {t('setup.start')}
          </button>
        </div>
      </div>
    </div>
  );
}
