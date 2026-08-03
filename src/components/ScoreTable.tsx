import { useI18n } from '../i18n';
import type { Player } from '../engine/types';

interface ScoreTableProps {
  players: Player[];
  history: { round: number; scores: number[] }[];
  showHeader?: boolean;
}

export function ScoreTable({ players, history, showHeader = true }: ScoreTableProps) {
  const { t } = useI18n();

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
            <th className="px-1 py-1 text-left text-[0.65rem]">{t('game.colRound')}</th>
            {players.map((p) => (
              <th key={p.id} className="max-w-0 truncate px-1 py-1 text-center text-[0.65rem] font-medium" title={p.name}>
                {p.name.length > 6 ? p.name.slice(0, 5) + '…' : p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.round} className="border-t border-zinc-800/60">
              <td className="px-1 py-0.5 text-left text-zinc-300 whitespace-nowrap">{t('game.round', { n: h.round })}</td>
              {players.map((p, i) => (
                <td key={p.id} className="px-1 py-0.5 text-center tabular-nums text-zinc-200">
                  {h.scores[i] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-700">
            <td className="px-1 py-1 text-left text-[0.65rem] font-bold text-zinc-300">{t('game.colTotal')}</td>
            {players.map((p) => (
              <td key={p.id} className="px-1 py-1 text-center text-[0.65rem] font-bold tabular-nums text-emerald-300">
                {p.bankedScore}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
