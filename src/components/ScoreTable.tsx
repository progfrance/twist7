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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      {showHeader && (
        <h3 className="mb-3 text-center text-base font-semibold text-emerald-300">
          {t('game.scoreRecap')}
        </h3>
      )}
      <table className="w-full text-base">
        <thead>
          <tr className="text-zinc-400">
            <th className="px-3 py-2 text-left">{t('game.colRound')}</th>
            {players.map((p) => (
              <th key={p.id} className="break-words px-3 py-2 text-center text-sm font-medium">{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.round} className="border-t border-zinc-800">
              <td className="px-3 py-2 text-left text-zinc-100">{t('game.round', { n: h.round })}</td>
              {players.map((p, i) => (
                <td key={p.id} className="px-3 py-2 text-center text-zinc-200">
                  {h.scores[i] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-700 text-zinc-400">
            <td className="px-3 py-2 text-left font-semibold">{t('game.colTotal')}</td>
            {players.map((p) => (
              <td key={p.id} className="px-3 py-2 text-center font-semibold text-emerald-300">
                {p.bankedScore}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
