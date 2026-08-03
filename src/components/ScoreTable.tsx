import { useI18n } from '../i18n';
import type { Player } from '../engine/types';

interface ScoreTableProps {
  players: Player[];
  history: { round: number; scores: number[] }[];
  showHeader?: boolean;
}

export function ScoreTable({ players, history, showHeader = true }: ScoreTableProps) {
  const { t } = useI18n();

  // Find the player with the highest total score
  const maxScore = Math.max(...players.map((p) => p.bankedScore));
  const leadingIdx = players.findIndex((p) => p.bankedScore === maxScore);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      {showHeader && (
        <h3 className="mb-2 text-center text-sm font-semibold text-emerald-300">
          {t('game.scoreRecap')}
        </h3>
      )}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-zinc-400">
            <th className="px-1.5 py-1 text-left text-[0.65rem]">{t('game.colRound')}</th>
            {players.map((p, i) => (
              <th
                key={p.id}
                className={`px-1.5 py-1 text-center text-[0.65rem] font-medium whitespace-nowrap ${
                  i === leadingIdx ? 'bg-emerald-500/10 text-emerald-300' : ''
                }`}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.round} className="border-t border-zinc-800/60">
              <td className="px-1.5 py-0.5 text-left text-zinc-300 whitespace-nowrap">{t('game.round', { n: h.round })}</td>
              {players.map((p, i) => (
                <td
                  key={p.id}
                  className={`px-1.5 py-0.5 text-center tabular-nums whitespace-nowrap ${
                    i === leadingIdx ? 'bg-emerald-500/10 text-emerald-200' : 'text-zinc-200'
                  }`}
                >
                  {h.scores[i] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-700">
            <td className="px-1.5 py-1 text-left text-[0.65rem] font-bold text-zinc-300">{t('game.colTotal')}</td>
            {players.map((p, i) => (
              <td
                key={p.id}
                className={`px-1.5 py-1 text-center text-[0.65rem] font-bold tabular-nums whitespace-nowrap ${
                  i === leadingIdx ? 'bg-emerald-500/15 text-emerald-300' : 'text-emerald-300'
                }`}
              >
                {p.bankedScore}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
