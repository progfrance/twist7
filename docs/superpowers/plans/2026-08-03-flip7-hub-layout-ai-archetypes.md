# Flip7: Circular Hub Layout + AI Archetypes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the linear game layout with a circular hub (deck centered, players around it) and replace the 3-level AI difficulty (easy/medium/hard) with 3 personality archetypes (aggressive/tactical/cautious).

**Architecture:** Two independent subsystems — layout refactor and AI refactor — that can be built in parallel. Each task produces a working, testable, independently commit-able change.

**Tech Stack:** TypeScript, React 18, TanStack Router, Vitest, Tailwind CSS v4

---

## File Structure

```
src/
├── ai/
│   ├── types.ts                  # Task 1: Archetype type + AIProfile interface
│   ├── engine.ts                 # Task 1: decide(state) main entry point
│   ├── profiles/
│   │   ├── aggressive.ts         # Task 1: Aggressive profile
│   │   ├── tactical.ts           # Task 1: Tactical profile
│   │   └── cautious.ts           # Task 1: Cautious profile
│   ├── index.ts                  # Task 1: Export new functions
│   └── __tests__/ai.test.ts      # Task 1: Update + add tests
├── hooks/useAiMove.ts            # Task 1: Use new engine
├── components/
│   ├── GameHub.tsx               # Task 2: New central hub component (deck + round info)
│   └── PlayerBox.tsx             # Task 3+4: Adjust for circular layout + archetype colors
├── routes/game.$mode.tsx         # Task 3: Refactor layout to circular hub
├── routes/index.tsx              # Task 4: Setup page - archetype selector
└── engine/types.ts               # Task 1: Add archetype field to Player
```

---

### Task 1: AI Profile System (Archetypes)

**Files:**
- Create: `src/ai/types.ts` (rewrite)
- Create: `src/ai/engine.ts` (new)
- Create: `src/ai/profiles/aggressive.ts` (new)
- Create: `src/ai/profiles/tactical.ts` (new)
- Create: `src/ai/profiles/cautious.ts` (new)
- Modify: `src/ai/index.ts`
- Modify: `src/hooks/useAiMove.ts`
- Modify: `src/engine/types.ts` — add `archetype` field to `Player`
- Modify: `src/ai/__tests__/ai.test.ts`

#### Step 1: Define the Archetype type and AIProfile interface

Create/replace `src/ai/types.ts`:

```ts
export type Archetype = 'aggressive' | 'tactical' | 'cautious';

export interface AIProfile {
  /** Maximum acceptable bust probability before staying */
  maxBustRisk: (state: import('../engine/types').Twist7State, me: import('../engine/types').Player) => number;
  /** Pick freeze target: returns player index */
  pickFreezeTarget: (state: import('../engine/types').Twist7State, drawerIdx: number) => number;
  /** Pick twist-three target: returns player index */
  pickTwistThreeTarget: (state: import('../engine/types').Twist7State, drawerIdx: number) => number;
  /** How much the archetype values Twist 7 (0 = ignore, 1 = prioritize) */
  twistSevenUrgency: number;
  /** Name for UI display */
  label: string;
}
```

#### Step 2: Write failing tests for the new archetype system

Add to `src/ai/__tests__/ai.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { decide } from '../engine';
import { createGame } from '../../engine/twist7Engine';
import type { Twist7State } from '../../engine/types';

function boardState(archetype: 'aggressive' | 'tactical' | 'cautious'): Twist7State {
  const s = createGame({
    players: [
      { id: 'a', name: 'A', isAI: true, archetype },
      { id: 'b', name: 'B', isAI: true, archetype: 'tactical' },
    ],
  });
  return { ...s, phase: 'play', currentIndex: 0 };
}

describe('AI archetypes', () => {
  it('aggressive takes at 0 points', () => {
    expect(decide(boardState('aggressive'))).toBe('take');
  });

  it('tactical takes at 0 points', () => {
    expect(decide(boardState('tactical'))).toBe('take');
  });

  it('cautious takes at 0 points', () => {
    expect(decide(boardState('cautious'))).toBe('take');
  });

  it('aggressive has higher bust tolerance than cautious', () => {
    // Build a state where player A has a decent board (score > 0)
    // and the bust probability is moderate (0.40).
    // Aggressive should take, cautious should stay.
    const s = createGame({
      players: [
        { id: 'a', name: 'A', isAI: true, archetype: 'aggressive' },
        { id: 'b', name: 'B', isAI: true, archetype: 'cautious' },
      ],
    });
    // Manually set A's row to [5] (score 5), B's row to [3]
    const withRows = {
      ...s,
      phase: 'play' as const,
      currentIndex: 0,
      players: s.players.map((p, i) =>
        i === 0
          ? { ...p, row: [{ id: 'n0', kind: 'number' as const, value: 5 }], distinct: [5] as number[] }
          : { ...p, row: [{ id: 'n1', kind: 'number' as const, value: 3 }], distinct: [3] as number[] },
      ),
      // Deck has no 5s left (bust risk only from 5), but has many other numbers
      // With 75 cards, 0 of which are 5s → pBust = 0
      deck: [{ id: 'n2', kind: 'number' as const, value: 7 }],
    };
    // pBust = 0, so all should take regardless of threshold
    expect(decide(withRows)).toBe('take');
  });
});
```

#### Step 3: Run tests to verify they fail

Run: `cd /c/Users/Dell/Desktop/MesProjets/flip7 && npx vitest run src/ai/__tests__/ai.test.ts -v`
Expected: FAIL — `decide` not exported from `../engine` yet

#### Step 4: Create the aggressive profile

Create `src/ai/profiles/aggressive.ts`:

```ts
import type { AIProfile } from '../types';
import { Twist7State } from '../../engine/types';
import { scoreRow, remainingNumberCopies, TWIST7_DISTINCT_COUNT } from '../../engine/twist7Engine';

function autoFreezeTarget(state: Twist7State, drawerIdx: number): number {
  let best = -1;
  let bestScore = Infinity; // aggressive: target the WEAKEST opponent
  state.players.forEach((p, i) => {
    if (i === drawerIdx || p.roundStatus !== 'active') return;
    const sc = scoreRow(p);
    if (sc < bestScore) { bestScore = sc; best = i; }
  });
  return best >= 0 ? best : drawerIdx;
}

function autoTwistThreeTarget(state: Twist7State, drawerIdx: number): number {
  let best = -1;
  let bestScore = Infinity; // aggressive: hit the weakest
  state.players.forEach((p, i) => {
    if (i === drawerIdx || p.roundStatus !== 'active') return;
    const sc = scoreRow(p);
    if (sc < bestScore) { bestScore = sc; best = i; }
  });
  return best >= 0 ? best : drawerIdx;
}

export const aggressive: AIProfile = {
  maxBustRisk: () => 0.65,
  pickFreezeTarget: autoFreezeTarget,
  pickTwistThreeTarget: autoTwistThreeTarget,
  twistSevenUrgency: 0.9,
  label: 'Agressif',
};
```

#### Step 5: Create the tactical profile

Create `src/ai/profiles/tactical.ts`:

```ts
import type { AIProfile } from '../types';
import { Twist7State } from '../../engine/types';
import { bustProbability, expectedGain } from '../../lib/probability';
import { scoreRow, remainingNumberCopies, TWIST7_DISTINCT_COUNT } from '../../engine/twist7Engine';

function autoFreezeTarget(state: Twist7State, drawerIdx: number): number {
  let best = -1;
  let bestScore = -1; // tactical: target the STRONGEST opponent (biggest threat)
  state.players.forEach((p, i) => {
    if (i === drawerIdx || p.roundStatus !== 'active') return;
    const sc = scoreRow(p);
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  return best >= 0 ? best : drawerIdx;
}

function autoTwistThreeTarget(state: Twist7State, drawerIdx: number): number {
  let best = -1;
  let bestScore = -1; // tactical: hit the strongest
  state.players.forEach((p, i) => {
    if (i === drawerIdx || p.roundStatus !== 'active') return;
    const sc = scoreRow(p);
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  return best >= 0 ? best : drawerIdx;
}

function tacticalMaxBustRisk(state: Twist7State, me: import('../engine/types').Player): number {
  const pBust = bustProbability(state, me.distinct);
  const ev = expectedGain(me.distinct) * (1 - pBust);
  // Adapt threshold: lower if EV is negative, higher if near Twist 7
  if (me.distinct.length >= TWIST7_DISTINCT_COUNT - 1) return 0.55;
  if (ev <= 0) return 0.30;
  return 0.40;
}

export const tactical: AIProfile = {
  maxBustRisk: tacticalMaxBustRisk,
  pickFreezeTarget: autoFreezeTarget,
  pickTwistThreeTarget: autoTwistThreeTarget,
  twistSevenUrgency: 0.6,
  label: 'Tactique',
};
```

#### Step 6: Create the cautious profile

Create `src/ai/profiles/cautious.ts`:

```ts
import type { AIProfile } from '../types';
import { Twist7State } from '../../engine/types';
import { bustProbability, remainingNumberCopies, scoreRow, TWIST7_DISTINCT_COUNT } from '../../engine/twist7Engine';

const HIGH_VALUES = [8, 9, 10, 11, 12];

function remainingHigh(state: Twist7State): number {
  let total = 0;
  for (const v of HIGH_VALUES) total += remainingNumberCopies(state, v);
  return total;
}

function autoFreezeTarget(state: Twist7State, drawerIdx: number): number {
  let best = -1;
  let bestScore = -1; // cautious: freeze the strongest (neutralize threat)
  state.players.forEach((p, i) => {
    if (i === drawerIdx || p.roundStatus !== 'active') return;
    const sc = scoreRow(p);
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  return best >= 0 ? best : drawerIdx;
}

function autoTwistThreeTarget(state: Twist7State, drawerIdx: number): number {
  return drawerIdx; // cautious: never force draws on others — might hit own player
}

function cautiousMaxBustRisk(state: Twist7State, me: import('../engine/types').Player): number {
  const pBust = bustProbability(state, me.distinct);
  // Lower threshold if few high cards remain
  if (remainingHigh(state) <= 1 && me.distinct.length < 5) return 0.15;
  if (me.distinct.length >= TWIST7_DISTINCT_COUNT - 1) return 0.45;
  return 0.25;
}

export const cautious: AIProfile = {
  maxBustRisk: cautiousMaxBustRisk,
  pickFreezeTarget: autoFreezeTarget,
  pickTwistThreeTarget: autoTwistThreeTarget,
  twistSevenUrgency: 0.3,
  label: 'Prudent',
};
```

#### Step 7: Create the main AI engine

Create `src/ai/engine.ts`:

```ts
import { Twist7State } from '../engine/types';
import { scoreRow, TWIST7_DISTINCT_COUNT } from '../engine/twist7Engine';
import { aggressive } from './profiles/aggressive';
import { tactical } from './profiles/tactical';
import { cautious } from './profiles/cautious';

const PROFILES: Record<string, import('./types').AIProfile> = {
  aggressive,
  tactical,
  cautious,
};

/**
 * Main AI decision function. Reads the player's archetype from state,
 * applies the profile's logic, and returns 'take' or 'stay'.
 */
export function decide(state: Twist7State): 'take' | 'stay' {
  const me = state.players[state.currentIndex];
  if (!me || me.roundStatus !== 'active') return 'stay';

  // Never stop with nothing on the board
  if (scoreRow(me) === 0) return 'take';

  const archetype = (me as any).archetype ?? 'tactical';
  const profile = PROFILES[archetype] ?? tactical;

  const pBust = profile.maxBustRisk(state, me);
  const effectiveThreshold = pBust * (1 + profile.twistSevenUrgency * 0.2);

  // Twist 7 urgency: if one away, lower the threshold
  const twist7Boost = me.distinct.length >= TWIST7_DISTINCT_COUNT - 1 ? 0.15 : 0;
  const finalThreshold = Math.min(effectiveThreshold + twist7Boost, 0.75);

  return effectiveThreshold >= finalThreshold ? 'take' : 'stay';
}
```

Wait, there's a logic error in that last line. Let me fix it:

```ts
  return effectiveThreshold >= finalThreshold ? 'take' : 'stay';
```

That's wrong — we should TAKE when pBust is LOW, not when threshold is high. The correct logic:

```ts
  // For aggressive: take when pBust < 0.65 (high tolerance)
  // For cautious: take when pBust < 0.25 (low tolerance)
  // We need to compare the ACTUAL bust probability against the profile's threshold.
  // But bustProbability is in probability.ts — we need to import it.
```

Actually, the `decide` function needs `bustProbability` to compare the actual risk against the profile's threshold. Let me redesign:

```ts
import { Twist7State } from '../engine/types';
import { bustProbability } from '../lib/probability';
import { scoreRow, TWIST7_DISTINCT_COUNT } from '../engine/twist7Engine';
import { aggressive } from './profiles/aggressive';
import { tactical } from './profiles/tactical';
import { cautious } from './profiles/cautious';

const PROFILES: Record<string, import('./types').AIProfile> = {
  aggressive,
  tactical,
  cautious,
};

export function decide(state: Twist7State): 'take' | 'stay' {
  const me = state.players[state.currentIndex];
  if (!me || me.roundStatus !== 'active') return 'stay';

  if (scoreRow(me) === 0) return 'take';

  const archetype = (me as any).archetype ?? 'tactical';
  const profile = PROFILES[archetype] ?? tactical;

  const pBust = bustProbability(state, me.distinct);
  const threshold = profile.maxBustRisk(state, me);

  // Twist 7 urgency adjusts threshold: if one away, be more lenient
  const adjustedThreshold = me.distinct.length >= TWIST7_DISTINCT_COUNT - 1
    ? threshold + 0.15
    : threshold;

  return pBust < adjustedThreshold ? 'take' : 'stay';
}
```

#### Step 8: Update ai/index.ts

```ts
export { decide } from './engine';
export type { Archetype, AIProfile } from './types';
```

#### Step 9: Update useAiMove.ts

```ts
import { decide } from '../ai/engine';

// In the useEffect timer:
const decision = decide(state);
if (decision === 'take') onTake();
else onStay();
```

#### Step 10: Add archetype field to Player type

In `src/engine/types.ts`, add to Player interface:

```ts
archetype?: 'aggressive' | 'tactical' | 'cautious';
```

#### Step 11: Update existing AI tests

Replace `src/ai/__tests__/ai.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { decide } from '../engine';
import { createGame } from '../../engine/twist7Engine';

function emptyBoardState(archetype: 'aggressive' | 'tactical' | 'cautious') {
  const s = createGame({
    players: [
      { id: 'a', name: 'A', isAI: true, archetype },
      { id: 'b', name: 'B', isAI: true, archetype: 'tactical' },
    ],
  });
  return { ...s, phase: 'play', currentIndex: 0 };
}

describe('AI never stops with an empty board', () => {
  it('aggressive takes when at 0 points', () => {
    expect(decide(emptyBoardState('aggressive'))).toBe('take');
  });

  it('tactical takes when at 0 points', () => {
    expect(decide(emptyBoardState('tactical'))).toBe('take');
  });

  it('cautious takes when at 0 points', () => {
    expect(decide(emptyBoardState('cautious'))).toBe('take');
  });
});
```

#### Step 12: Run tests and typecheck

Run: `npm run test` — all tests pass
Run: `npm run typecheck` — no errors

#### Step 13: Commit

```bash
git add src/ai/types.ts src/ai/engine.ts src/ai/profiles/aggressive.ts src/ai/profiles/tactical.ts src/ai/profiles/cautious.ts src/ai/index.ts src/hooks/useAiMove.ts src/engine/types.ts src/ai/__tests__/ai.test.ts
git commit -m "feat: replace difficulty levels with AI archetype profiles"
```

---

### Task 2: GameHub Component (Central Hub)

**Files:**
- Create: `src/components/GameHub.tsx`

#### Step 1: Write the GameHub component

Create `src/components/GameHub.tsx`:

```tsx
import { DeckPile } from './DeckPile';
import type { Twist7State } from '../engine/types';
import { useI18n } from '../i18n';

interface GameHubProps {
  state: Twist7State;
}

export function GameHub({ state }: GameHubProps) {
  const { t } = useI18n();
  const n = state.players.length;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Deck pile — the visual centerpiece */}
      <div className="relative">
        <DeckPile count={state.deck.length} label={t('game.deck')} />
        {/* Pulse animation when it's a human's turn */}
        {state.phase === 'play' && !state.players[state.currentIndex]?.isAI && (
          <div className="absolute inset-0 rounded-xl animate-pulse-ring" />
        )}
      </div>

      {/* Round info panel */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-center">
        <div className="text-2xl font-extrabold text-emerald-300">
          {t('game.round', { n: state.roundNumber })}
        </div>
        <div className="mt-1 text-xs text-zinc-400">
          {t('game.dealer', { name: state.players[state.dealerIndex]?.name ?? '?' })}
        </div>
        <div className="text-xs text-zinc-500">
          {t('game.target', { n: state.targetScore })}
        </div>
      </div>
    </div>
  );
}
```

#### Step 2: Verify it compiles

Run: `npx tsc --noEmit`
Expected: No errors

#### Step 3: Commit

```bash
git add src/components/GameHub.tsx
git commit -m "feat: add GameHub central component (deck + round info)"
```

---

### Task 3: Circular Hub Layout in game.$mode.tsx

**Files:**
- Modify: `src/routes/game.$mode.tsx`
- Modify: `src/components/PlayerBox.tsx`

#### Step 1: Write the new layout in game.$mode.tsx

The key change: replace the current `n === 2` / `n >= 3` conditional layout with a circular hub pattern.

Current structure (simplified):
```tsx
{n === 2 ? (
  <div className="flex flex-col gap-6">
    <DeckPile ... />
    <div className="flex flex-col lg:flex-row">
      {players.map(p => <PlayerBox ... />)}
    </div>
  </div>
) : (
  <div className="flex flex-col gap-6">
    <DeckPile ... />
    <div className="grid ...">
      {players.map(p => <PlayerBox ... />)}
    </div>
  </div>
)}
```

New structure:
```tsx
<div className="flex flex-col lg:flex-row gap-6">
  {/* Left: circular hub area */}
  <div className="flex-1 min-w-0">
    <div className="relative mx-auto max-w-2xl">
      {/* GameHub centered */}
      <div className="flex justify-center">
        <GameHub state={state} />
      </div>

      {/* Players arranged around the hub */}
      <div className={`mt-6 ${n === 2 ? 'flex flex-col gap-4' : 'grid gap-4'}`}
        style={n >= 3 ? { gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' } : undefined}>
        {state.players.map((p, i) => (
          <PlayerBox
            key={p.id}
            p={p}
            index={i}
            isCurrent={i === state.currentIndex && state.phase === 'play'}
            cardSize={n >= 3 ? 'sm' : 'md'}
            freezeDrawer={freezeDrawer}
            onFreezeTarget={resolveFreeze}
          />
        ))}
      </div>
    </div>
  </div>

  {/* Right sidebar: controls + scores (unchanged) */}
  <aside className="lg:w-96 lg:shrink-0 flex flex-col gap-4">
    {/* ... existing control panel + ScoreTable ... */}
  </aside>
</div>
```

#### Step 2: Adjust PlayerBox for the hub layout

In `src/components/PlayerBox.tsx`, add an optional `archetype` prop for visual coloring:

```tsx
interface PlayerBoxProps {
  p: Player;
  index: number;
  isCurrent: boolean;
  cardSize?: CardSize;
  freezeDrawer?: number | null;
  onFreezeTarget?: (i: number) => void;
  archetype?: 'aggressive' | 'tactical' | 'cautious';
}

// Add archetype-based border color when it's an AI player
const archetypeBorder = p.isAI && archetype
  ? archetype === 'aggressive' ? 'border-orange-500/50'
    : archetype === 'tactical' ? 'border-emerald-500/50'
    : 'border-slate-400/50'
  : '';
```

#### Step 3: Verify tests + typecheck + build

Run: `npm run test && npm run typecheck && npm run build`
Expected: All pass

#### Step 4: Commit

```bash
git add src/routes/game.$mode.tsx src/components/PlayerBox.tsx
git commit -m "refactor: restructure game layout around circular GameHub"
```

---

### Task 4: Archetype Selector in Setup Page

**Files:**
- Modify: `src/routes/index.tsx`

#### Step 1: Add archetype selector to setup

In `src/routes/index.tsx`, replace the difficulty selector with an archetype selector:

```tsx
const ARCHETYPES: { value: 'aggressive' | 'tactical' | 'cautious'; labelKey: string }[] = [
  { value: 'aggressive', labelKey: 'archetype.aggressive' },
  { value: 'tactical', labelKey: 'archetype.tactical' },
  { value: 'cautious', labelKey: 'archetype.cautious' },
];

// In the player setup row, replace difficulty select:
{p.isAI && (
  <select
    value={p.archetype ?? 'tactical'}
    onChange={(e) => update(p.id, { archetype: e.target.value as 'aggressive' | 'tactical' | 'cautious' })}
    className="..."
  >
    {ARCHETYPES.map((a) => (
      <option key={a.value} value={a.value}>
        {t(a.labelKey)}
      </option>
    ))}
  </select>
)}
```

#### Step 2: Update PlayerSetup interface

```tsx
interface PlayerSetup {
  id: string;
  name: string;
  isAI: boolean;
  archetype: 'aggressive' | 'tactical' | 'cautious';
}
```

Update initial state and `addPlayer` defaults.

#### Step 3: Add i18n keys

Add to `src/i18n/locales/en.ts`, `fr.ts`, `es.ts`:
```ts
archetype: {
  aggressive: 'Aggressive',
  tactical: 'Tactical',
  cautious: 'Cautious',
},
```

#### Step 4: Verify and commit

Run: `npm run test && npm run typecheck && npm run build`
Expected: All pass

```bash
git add src/routes/index.tsx src/i18n/locales/en.ts src/i18n/locales/fr.ts src/i18n/locales/es.ts
git commit -m "feat: add archetype selector to setup page"
```

---

## Execution Order

Tasks 1 and 2 can be built in parallel (no dependencies between them). Task 3 depends on Task 2. Task 4 depends on Task 1.

Recommended order:
1. **Task 1** — AI archetype system (core logic, ~200 lines)
2. **Task 2** — GameHub component (visual center, ~50 lines)
3. **Task 3** — Layout refactor (uses GameHub, ~80 lines changed)
4. **Task 4** — Setup page archetype selector (uses AI types, ~30 lines)

---

## Verification After All Tasks

- [ ] `npm run test` → all tests pass (22 engine + 3 AI archetype + any new tests)
- [ ] `npm run typecheck` → no errors
- [ ] `npm run build` → succeeds
- [ ] Manual: open game, verify circular layout renders correctly with 2, 3, 4+ players
- [ ] Manual: verify AI archetypes behave differently (aggressive takes more risks, cautious banks early)
- [ ] Manual: verify archetype selector in setup page works for all 3 options
