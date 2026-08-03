import type { ReactNode } from 'react';
import { Card as CardModel } from '../engine/types';
import { useI18n } from '../i18n';

/* ─── Types ─── */
type Variant = 'active' | 'frozen' | 'busted' | 'deck';
type Size = 'sm' | 'md';

/* ─── Sizes ─── */
const SIZE_CLASS: Record<Size, string> = {
  sm: 'w-[3.75rem] h-[5.5rem] text-[0.65rem]',
  md: 'w-24 h-34 text-base',
};

const PIP_CLASS: Record<Size, string> = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
};

/* ─── Ring (border highlight) per card variant ─── */
const RING: Partial<Record<Variant, string>> = {
  frozen: 'ring-2 ring-sky-300',
  busted: 'ring-2 ring-red-500/70',
};

/* ─── Official colours per value (BGG component list) ─── */
const VALUE_COLOR: Record<number, string> = {
  0: '#d946ef',
  1: '#d9b68a',
  2: '#9bb53d',
  3: '#c8287a',
  4: '#0d9488',
  5: '#16a34a',
  6: '#6b21a8',
  7: '#f8a38d',
  8: '#84cc16',
  9: '#ea580c',
  10: '#dc2626',
  11: '#2563eb',
  12: '#713f12',
};

function valueColor(v: number): string {
  return VALUE_COLOR[v] ?? '#64748b';
}

/* ─── Gold metallic gradient ─── */
const GOLD = 'linear-gradient(135deg,#bf953f,#fcf6ba,#b38728,#fbf5b7,#aa771c)';

/* ─── Art Deco geometric gold frame ─── */
function GoldFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        border: '1.5px solid #bf953f',
        borderRadius: 'inherit',
        boxShadow:
          'inset 0 0 0 4px #e8d5a3, inset 0 0 0 5px #bf953f, inset 0 0 0 8px #f5eddd, 0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* corner diamonds */}
      <span
        className="absolute -top-[4px] -left-[4px] w-[10px] h-[10px] rotate-45"
        style={{ background: GOLD }}
      />
      <span
        className="absolute -top-[4px] -right-[4px] w-[10px] h-[10px] rotate-45"
        style={{ background: GOLD }}
      />
      <span
        className="absolute -bottom-[4px] -left-[4px] w-[10px] h-[10px] rotate-45"
        style={{ background: GOLD }}
      />
      <span
        className="absolute -bottom-[4px] -right-[4px] w-[10px] h-[10px] rotate-45"
        style={{ background: GOLD }}
      />
      {/* top/bottom gold bars */}
      <div
        className="absolute left-3 right-3 top-[3px] h-[2px]"
        style={{ background: GOLD }}
      />
      <div
        className="absolute left-3 right-3 bottom-[3px] h-[2px]"
        style={{ background: GOLD }}
      />
      {children}
    </div>
  );
}

/* ─── Decorative bottom arch (SVG) ─── */
function Arch({ color = '#bf953f' }: { color?: string }) {
  return (
    <svg
      className="absolute bottom-0 left-1/2 -translate-x-1/2"
      width="70%"
      height="14%"
      viewBox="0 0 120 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 24 C8 8 60 2 60 2 C60 2 112 8 112 24"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M4 24 C4 4 60 0 60 0 C60 0 116 4 116 24"
        stroke="#e8d5a3"
        strokeWidth="0.8"
        fill="none"
      />
      {/* segments along arch */}
      {[20, 35, 50, 65, 80, 100].map((x, i) => (
        <line
          key={i}
          x1={x}
          y1="2"
          x2={x}
          y2="8"
          stroke={color}
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

/* ─── Shell motif (coquillage) ─── */
function Shell({
  color,
  size = 24,
}: {
  color: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2 C12 2 2 8 2 16 C2 20 6.5 22 12 22 C17.5 22 22 20 22 16 C22 8 12 2 12 2Z"
        stroke={color}
        strokeWidth="1.2"
        fill={`${color}22`}
      />
      <path
        d="M12 6 C12 6 8 10 8 14 C8 16.5 10 18 12 18 C14 18 16 16.5 16 14 C16 10 12 6 12 6Z"
        stroke={color}
        strokeWidth="0.8"
        fill={`${color}44`}
      />
      <line x1="12" y1="2" x2="12" y2="6" stroke={color} strokeWidth="0.8" />
      <line x1="6" y1="8" x2="8" y2="10" stroke={color} strokeWidth="0.8" />
      <line x1="18" y1="8" x2="16" y2="10" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}

/* ─── Heart icon ─── */
function Heart({
  color = '#e11d48',
  outline = '#bf953f',
  size = 28,
}: {
  color?: string;
  outline?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 24 C14 24 3 18 3 9.5 C3 5.5 6.5 2 10 2 C12 2 14 4 14 4 C14 4 16 2 18 2 C21.5 2 25 5.5 25 9.5 C25 18 14 24 14 24Z"
        stroke={outline}
        strokeWidth="1.5"
        fill={color}
      />
    </svg>
  );
}

/* ─── Lightning bolt icon ─── */
function Lightning({
  color = '#e11d48',
  outline = '#bf953f',
  size = 32,
}: {
  color?: string;
  outline?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 2 L6 16 L13 16 L11 26 L22 12 L15 12 L17 2Z"
        stroke={outline}
        strokeWidth="1.2"
        fill={color}
      />
    </svg>
  );
}

/* ─── Utility: gold-text outline for large numbers ─── */
function GoldOutlineText({
  text,
  color,
  className,
}: {
  text: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`relative font-black leading-none ${className ?? ''}`}
      style={{
        color,
        textShadow:
          `1px 1px 0 #bf953f, -1px -1px 0 #bf953f, 1px -1px 0 #bf953f, -1px 1px 0 #bf953f, ` +
          `2px 2px 0 #b38728, -2px -2px 0 #b38728, 2px -2px 0 #b38728, -2px 2px 0 #b38728`,
        WebkitTextStroke: `0.5px #fcf6ba`,
      }}
    >
      {text}
    </span>
  );
}

/* ─── Card back ─── */
function DeckBack({ size, className = '' }: { size: Size; className?: string }) {
  return (
    <div
      className={`${SIZE_CLASS[size]} relative select-none overflow-hidden rounded-xl shadow-lg ${className}`}
      style={{
        background:
          'repeating-linear-gradient(45deg,#0f172a,#0f172a 6px,#1e293b 6px,#1e293b 12px)',
      }}
    >
      <GoldFrame />
      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
      <div className="flex h-full items-center justify-center">
        <span className="rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 font-black tracking-tight text-white shadow-inner">
          Twist7
        </span>
      </div>
    </div>
  );
}

/* ─── Number card ─── */
function NumberCardContent({
  value,
  color,
  size,
  t,
}: {
  value: number;
  color: string;
  size: Size;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const isSm = size === 'sm';
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 py-4">
      {/* top instruction text – empty for number cards */}
      <div className="flex-1" />

      {/* number value with gold outline + shell motifs */}
      <div className="flex w-full items-center justify-center gap-1">
        {!isSm && <Shell color={color} size={20} />}
        <GoldOutlineText
          text={String(value)}
          color={color}
          className="text-[2.2em]"
        />
        {!isSm && <Shell color={color} size={20} />}
      </div>

      {/* number name */}
      {!isSm && (
        <span
          className="mt-0.5 text-[0.35em] font-bold uppercase tracking-widest text-gray-800"
        >
          {t(`card.number.${value}`)}
        </span>
      )}

      <div className="flex-1" />

      {/* pips row */}
      {value > 0 && value <= 12 && (
        <div className="flex flex-wrap justify-center gap-[2px] mb-1">
          {Array.from({ length: Math.min(value, 8) }).map((_, i) => (
            <span
              key={i}
              className={`rounded-full ${PIP_CLASS[size]}`}
              style={{ background: color }}
            />
          ))}
          {value > 8 && <span className="text-[0.3em] text-gray-500">+{value - 8}</span>}
        </div>
      )}

      {value === 0 && (
        <span className="text-[0.3em] font-semibold text-gray-500 mb-1">0 pt</span>
      )}
    </div>
  );
}

/* ─── Modifier card (+N / ×2) ─── */
function ModifierCardContent({
  amount,
  isDouble,
  t,
}: {
  amount: number;
  isDouble: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const accent = '#be123c';
  const symbol = isDouble ? '×' : '+';
  const text = isDouble
    ? t('card.modifier.double')
    : t('card.modifier.plus', { n: amount });

  return (
    <div className="flex h-full flex-col items-center justify-center px-2 py-4 text-black">
      {/* top text */}
      <span className="text-[0.3em] font-bold uppercase tracking-wider text-center leading-tight">
        {text}
      </span>

      <div className="flex-1" />

      {/* large symbol + number */}
      <div className="flex items-start gap-0">
        <span className="text-[1.5em] font-black leading-none">{symbol}</span>
        <GoldOutlineText
          text={String(amount)}
          color={accent}
          className="text-[2.2em]"
        />
      </div>

      <div className="flex-1" />

      {/* bottom text repeated */}
      <span className="text-[0.3em] font-bold uppercase tracking-wider text-center leading-tight">
        {text}
      </span>
    </div>
  );
}

/* ─── Shared layout for all special cards (matches modifier +N format) ─── */
function SpecialCardLayout({
  label,
  sub,
  emblem,
  textColor,
}: {
  label: string;
  sub: string;
  emblem: ReactNode;
  textColor: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 py-4 text-center">
      <span
        className="text-[0.3em] font-bold uppercase tracking-wider leading-tight"
        style={{ color: textColor }}
      >
        {label}
      </span>

      <div className="flex-1" />

      {emblem}

      <div className="flex-1" />

      <span
        className="text-[0.3em] font-bold uppercase tracking-wider leading-tight"
        style={{ color: textColor }}
      >
        {sub}
      </span>
    </div>
  );
}

/* ─── Second Chance card ─── */
function SecondChanceContent({
  size,
  t,
}: {
  size: Size;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <SpecialCardLayout
      label={t('card.secondChance.keep')}
      sub={t('card.secondChance.discard')}
      textColor="white"
      emblem={
        <Heart color="#e11d48" outline="#bf953f" size={size === 'sm' ? 20 : 30} />
      }
    />
  );
}

/* ─── Twist Three card ─── */
function TwistThreeContent({
  size,
  t,
}: {
  size: Size;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <SpecialCardLayout
      label={t('card.twistThree.draw')}
      sub={t('card.twistThree.by')}
      textColor="black"
      emblem={
        <Lightning color="#e11d48" outline="#bf953f" size={size === 'sm' ? 24 : 34} />
      }
    />
  );
}

/* ─── Freeze card ─── */
function FreezeContent({
  t,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <SpecialCardLayout
      label={t('card.freeze.target')}
      sub={t('card.freeze.lose')}
      textColor="white"
      emblem={
        <GoldOutlineText text="❄" color="#e0f2fe" className="text-[2.2em]" />
      }
    />
  );
}

/* ─── Main Card component ─── */
export function Card({
  card,
  variant = 'active',
  size = 'md',
  className = '',
}: {
  card?: CardModel;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const { t } = useI18n();
  if (variant === 'deck') return <DeckBack size={size} className={className} />;
  if (!card) return null;

  const ring = RING[variant] ?? '';

  const dim = variant === 'frozen' || variant === 'busted';
  const opacity = dim ? 0.55 : 1;

  const base = `${SIZE_CLASS[size]} relative select-none rounded-xl shadow-lg ${ring} ${className}`;

  if (card.kind === 'number') {
    const color = valueColor(card.value);
    return (
      <div
        className={base}
        style={{
          background: 'linear-gradient(160deg,#f5ede0,#e8dcc8)',
          opacity,
        }}
      >
        <GoldFrame>
          <Arch color={color} />
        </GoldFrame>
        <NumberCardContent value={card.value} color={color} size={size} t={t} />
      </div>
    );
  }

  if (card.kind === 'modifier') {
    const isDouble = card.modifier === 'double';
    return (
      <div
        className={base}
        style={{
          background: 'linear-gradient(160deg,#fef3c7,#f59e0b)',
          opacity,
        }}
      >
        <GoldFrame>
          <Arch color="#be123c" />
        </GoldFrame>
        <ModifierCardContent
          amount={card.amount}
          isDouble={isDouble}
          t={t}
        />
      </div>
    );
  }

  // action cards
  const actionConfig: Record<
    string,
    { bg: string; arch: string; content: JSX.Element }
  > = {
    freeze: {
      bg: 'linear-gradient(160deg,#38bdf8,#0284c7)',
      arch: '#7dd3fc',
      content: <FreezeContent t={t} />,
    },
    twistThree: {
      bg: 'linear-gradient(160deg,#fde047,#d97706)',
      arch: '#f59e0b',
      content: <TwistThreeContent size={size} t={t} />,
    },
    secondChance: {
      bg: 'linear-gradient(160deg,#fca5a5,#dc2626)',
      arch: '#f87171',
      content: <SecondChanceContent size={size} t={t} />,
    },
  };

  const cfg = actionConfig[card.action];
  return (
    <div
      className={base}
      style={{
        background: cfg.bg,
        opacity,
      }}
    >
      <GoldFrame>
        <Arch color={cfg.arch} />
      </GoldFrame>
      {cfg.content}
    </div>
  );
}
