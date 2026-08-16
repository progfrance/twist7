import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Card } from './Card';
import type { Card as CardModel } from '../engine/types';
import { useI18n } from '../i18n';

const FREEZE: CardModel = { id: 'r-freeze', kind: 'action', action: 'freeze' };
const SECOND: CardModel = { id: 'r-second', kind: 'action', action: 'secondChance' };
const TWIST_THREE: CardModel = { id: 'r-twist', kind: 'action', action: 'twistThree' };

const ACTIONS: { card: CardModel; titleKey: string }[] = [
  { card: FREEZE, titleKey: 'rules.action.freeze' },
  { card: SECOND, titleKey: 'rules.action.second' },
  { card: TWIST_THREE, titleKey: 'rules.action.twistThree' },
];

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const actionDesc = (index: number): ReactNode => {
    switch (index) {
      case 0:
        return (
          <>
            <p>{t('rules.freeze.desc')}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>{t('rules.freeze.bullet1')}</li>
              <li>{t('rules.freeze.bullet2')}</li>
            </ul>
          </>
        );
      case 1:
        return <p>{t('rules.second.desc')}</p>;
      case 2:
        return <p>{t('rules.twistThree.desc')}</p>;
      default:
        return null;
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('rules.title')}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="modal-content rules-modal relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"
          aria-label={t('rules.close')}
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-emerald-400">{t('rules.title')}</h2>

        <div className="rules-content mt-4 space-y-4 text-sm leading-relaxed text-zinc-300">
          <section>
            <h3 className="text-lg font-semibold text-zinc-100">{t('rules.objective.title')}</h3>
            <p>{t('rules.objective.body')}</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-zinc-100">{t('rules.flow.title')}</h3>
            <p>{t('rules.flow.body1')}</p>
            <p>{t('rules.flow.body2')}</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-zinc-100">{t('rules.twist.title')}</h3>
            <p>{t('rules.twist.body')}</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-zinc-100">{t('rules.actions.title')}</h3>
            <p>{t('rules.actions.intro')}</p>
            <div className="action-card-selector mt-3 flex gap-3">
              {ACTIONS.map((a, i) => (
                <button
                  key={a.titleKey}
                  onClick={() => setSelected(i)}
                  className={`card-container rounded-xl p-1 transition ${
                    selected === i ? 'selected ring-2 ring-emerald-400' : 'ring-1 ring-zinc-700'
                  }`}
                >
                  <Card card={a.card} size="sm" />
                </button>
              ))}
            </div>
            <div className="action-card-description mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <h4 className="font-semibold text-emerald-300">{t(ACTIONS[selected].titleKey)}</h4>
              <div className="mt-1 text-zinc-300">{actionDesc(selected)}</div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-primary rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
          >
            {t('rules.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
