import { Card } from './Card';

export function DeckPile({ count, label }: { count: number; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 80, height: 112 }}>
        {/* 2 background layers suggesting a stacked deck */}
        <div
          className="absolute inset-0 rounded-xl border border-slate-900"
          style={{ transform: 'translate(3px, 3px)', background: 'rgba(15,23,42,0.85)' }}
        />
        <div
          className="absolute inset-0 rounded-xl border border-slate-700"
          style={{ transform: 'translate(1.5px, 1.5px)', background: 'rgba(30,41,59,0.9)' }}
        />
        {/* top visible card */}
        <Card variant="deck" size="md" />
      </div>
      {label !== undefined && (
        <span className="text-xs font-medium text-zinc-400">{label}</span>
      )}
      <span className="-mt-1 rounded bg-zinc-800 px-2 py-0.5 text-[0.7rem] font-bold tabular-nums text-zinc-300">
        {count}
      </span>
    </div>
  );
}
