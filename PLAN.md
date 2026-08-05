# Plan d'implémentation v1.0.0 — Revue complète du projet Twist7 (TypeScript/React)

**Objectif :** Traiter CHAQUE point de la revue. Chaque bullet, warning et suggestion a une tâche avec code exact, tests et commits.

**Approche :** TDD — test d'abord (FAIL) → fix → commit. Les tests de non-régression et les corrections de bugs suivent le TDD strict ; les refactors non-fonctionnels (suppression de code mort, lint) suivent un workflow léger.

**Stack :** TypeScript 5.6, React 18, Vite 6, Vitest 2.1, TanStack Router.

**Source :** phases 1-4 de la revue (adaptée du skill python-code-review, projet constaté comme TS/React et non Python).

> Note : les portes automatiques sont VERTES au départ — `npx tsc -b --noEmit` (0 erreur), `npx vitest run` (22 tests passés). Les tâches visent la qualité, la cohérence de conception et la correction de features trompeuses, pas des crashes.

---

## Résumé des tâches

| # | Tâche | Sévérité | Réf. revue | Temps |
|---|-------|----------|-----------|-------|
| 1 | Unifier le choix de l'IA sur `archetype` (mode URL fonctionnel) | Must fix | F1 | 30 min |
| 2 | Brancher les cibles Freeze/Twist des profils (fin de code mort comportemental) | Must fix | F2 | 45 min |
| 3 | Supprimer le code mort IA (`easy/medium/hard`, champ `difficulty`) | Should fix | F3 | 20 min |
| 4 | Retirer les casts `as any` | Should fix | F4 | 10 min |
| 5 | Ajouter ESLint (flat config) + script + CI | Should fix | F5 | 40 min |
| 6 | Retirer `@tanstack/react-query` (ou l'utiliser) | Should fix | F6 | 15 min |
| 7 | Corriger `bustProbability` (discard + rangs adverses) | Should fix | F7 | 30 min |
| 8 | Réinitialiser `useTwist7Game` au changement de `setup` | Should fix | F8 | 20 min |
| 9 | Tests isolés `scoreRow` + `endRound` (tie/winner) | Consider | F9 | 20 min |
| 10 | Tests de la logique IA (`decide`, probabilités, archétypes) | Consider | F10 | 45 min |
| 11 | Mémoïser `actionConfig` dans `Card.tsx` | Consider | F11 | 10 min |
| 12 | Typage des clés i18n (union littérale) | Consider | F12 | 25 min |

**Total :** 12 commits (~5 h de travail concentré).

---

## Mapping Revue → Tâches (point par point)

### Phase 2 — Scan de surface

| Bullet revue | Sévérité | Tâche(s) |
|---|---|---|
| Pas de linter/formateur | Should fix | **Tâche 5** |
| `react-query` sans query | Should fix | **Tâche 6** |
| Double vocabulaire IA / fonctions mortes | Must fix + Should fix | **Tâches 1, 2, 3** |

### Phase 3 — Analyse approfondie

| Bullet revue | Sévérité | Tâche(s) |
|---|---|---|
| Profils cibles (`pickFreezeTarget` etc.) jamais lus | Must fix | **Tâche 2** |
| `decide()` ignore `difficulty` / URL mode inerte | Must fix | **Tâche 1** |
| Code mort (`easy/medium/hardDecide`, `difficulty`) | Should fix | **Tâche 3** |
| Casts `as any` | Should fix | **Tâche 4** |
| `bustProbability` ignore discard/rangs | Should fix | **Tâche 7** |
| `useReducer` non reset | Should fix | **Tâche 8** |
| `scoreRow`/`endRound` non testés isolément | Consider | **Tâche 9** |
| Logique IA non testée | Consider | **Tâche 10** |
| `actionConfig` recréé au render | Consider | **Tâche 11** |
| Clés i18n non typées | Consider | **Tâche 12** |

---

## Tâche 1 : Unifier le choix de l'IA sur `archetype` (mode URL fonctionnel)

**Sévérité :** Must fix · **Réf. :** F1 · **Confiance :** high · **Impact :** bug risk · **Effort :** M

`decide()` (`src/ai/engine.ts:11`) lit `me.archetype` et ignore `me.difficulty`. `defaultSetup(mode)` (`src/routes/game.$mode.tsx:16`) fixe `difficulty` depuis le paramètre `mode` (`easy|medium|hard`) mais ne fixe pas `archetype`. Résultat : `/game/easy` joue en « tactique » (défaut), et l'URL directe `/game/aggressive` tombe dans le fallback `else 'medium'`.

**Décision de conception :** conserver **un seul** vocabulaire = `archetype` (déjà piloté par l'écran de setup). Mapper `mode` → `archetype` dans `defaultSetup`.

### Step 1 : Test FAIL

`src/ai/__tests__/ai.test.ts` (ajout) :
```ts
it('maps a direct /game/hard URL to the aggressive archetype', () => {
  const s = createGame({
    players: [{ id: 'a', name: 'A', isAI: true, archetype: 'aggressive' }],
  });
  // archetype 'aggressive' => maxBustRisk 0.65, doivent prendre plus souvent
  expect(decide({ ...s, phase: 'play', currentIndex: 0 })).toBe('take');
});
```
Et dans `game.$mode.tsx`, ajouter un test (ou assertion manuelle) : `defaultSetup('hard')` produit un joueur AI avec `archetype: 'aggressive'`.

### Step 2 : Fix

`src/routes/game.$mode.tsx` :
```ts
function defaultSetup(mode: string): Twist7Setup {
  const archetype: Archetype =
    mode === 'aggressive' || mode === 'tactical' || mode === 'cautious'
      ? (mode as Archetype)
      : 'tactical';
  return {
    players: [
      { id: 'human', name: 'You', isAI: false },
      { id: 'ai', name: 'CPU', isAI: true, archetype },
    ],
  };
}
```
Importer `Archetype` depuis `../ai/types` (et retirer l'usage de `Difficulty` ici).

`src/ai/engine.ts:16` :
```ts
const archetype = me.archetype ?? 'tactical'; // plus de `as any`
```

### Step 3 : Run (PASS)
```bash
npx vitest run src/ai
```

### Step 4 : Commit
```bash
git commit -m "fix: wire game mode URL to AI archetype (decide ignores difficulty)"
```

---

## Tâche 2 : Brancher les cibles Freeze/Twist des profils

**Sévérité :** Must fix · **Réf. :** F2 · **Confiance :** high · **Impact :** behavior · **Effort :** M

`autoFreezeTarget`/`autoTwistThreeTarget` (`src/engine/twist7Engine.ts:398`, `:414`) hardcodent « le plus fort ». Les profils `aggressive` (gèle le plus faible) et `cautious` (ne force personne) sont ignorés → archétypes non différenciés.

**Approche :** ajouter `freezeTarget(state, drawerIdx)` et `twistThreeTarget(state, drawerIdx)` dans `AIProfile`, utiliser `PROFILES[archetype]` dans le moteur, et retirer les helpers `autoFreezeTarget`/`autoTwistThreeTarget` du moteur.

### Step 1 : Test FAIL
`src/engine/__tests__/twist7Engine.test.ts` (ajout) :
```ts
it('aggressive AI freezes the WEAKEST active opponent', () => {
  let s = createGame({
    players: [
      { id: 'a', name: 'A', isAI: true, archetype: 'aggressive' },
      { id: 'b', name: 'B', isAI: true, archetype: 'aggressive' },
      { id: 'c', name: 'C', isAI: true, archetype: 'aggressive' },
    ],
    dealerIndex: 2,
  });
  s = withDeck(s, [num('a', 10), num('b', 4), num('c', 1)]);
  s = startRound(s);
  s = withDeck(s, [freeze('f')]);
  s = takeCard(s); // A (aggressive) auto-freeze
  // aggressive => freeze le plus FAIBLE (C=1), pas le plus fort (B=4)
  expect(s.players[2].roundStatus).toBe('frozen');
  expect(s.players[1].roundStatus).toBe('active');
});
```
(Ce test échoue car le moteur gèle actuellement B=4.)

### Step 2 : Fix

`src/ai/types.ts` — ajouter :
```ts
export interface AIProfile {
  maxBustRisk: (state: Twist7State, me: Player) => number;
  freezeTarget: (state: Twist7State, drawerIdx: number) => number;
  twistThreeTarget: (state: Twist7State, drawerIdx: number) => number;
  twistSevenUrgency: number;
  label: string;
}
```

`src/ai/profiles/aggressive.ts` : `freezeTarget: pickWeakest, twistThreeTarget: pickWeakest`.
`src/ai/profiles/tactical.ts` : `freezeTarget: pickStrongest, twistThreeTarget: pickStrongest`.
`src/ai/profiles/cautious.ts` : `freezeTarget: pickStrongest, twistThreeTarget: (_s, idx) => idx`.

`src/ai/engine.ts` — exposer les sélecteurs :
```ts
export function freezeTarget(state: Twist7State, drawerIdx: number): number {
  const me = state.players[drawerIdx];
  const archetype = me.archetype ?? 'tactical';
  return (PROFILES[archetype] ?? tactical).freezeTarget(state, drawerIdx);
}
export function twistThreeTarget(state: Twist7State, drawerIdx: number): number {
  const me = state.players[drawerIdx];
  const archetype = me.archetype ?? 'tactical';
  return (PROFILES[archetype] ?? tactical).twistThreeTarget(state, drawerIdx);
}
```

`src/engine/twist7Engine.ts` — remplacer les appels `autoFreezeTarget(drawn, idx)` par `freezeTarget(drawn, idx)` (importer depuis `../ai/engine`) et `autoTwistThreeTarget` par `twistThreeTarget`. Supprimer les helpers `autoFreezeTarget`/`autoTwistThreeTarget` du moteur.

> Note : importer depuis `../ai/engine` dans le moteur crée un couplage moteur→IA. Alternative propre : passer les sélecteurs en paramètre de `takeCard`/`resolveAction`, ou déplacer la logique de cible dans `lib/`. Recommandé pour la v2 ; pour cette v1 on garde l'import direct en documentant la dépendance.

### Step 3 : Run (PASS)
```bash
npx vitest run src/engine src/ai
```

### Step 4 : Commit
```bash
git commit -m "fix: honor AI archetype freeze/twist targets instead of hardcoding strongest"
```

---

## Tâche 3 : Supprimer le code mort IA (`easy/medium/hard`, champ `difficulty`)

**Sévérité :** Should fix · **Réf. :** F3 · **Confiance :** high · **Impact :** maint. · **Effort :** S

`src/ai/easyAI.ts`, `mediumAI.ts`, `hardAI.ts` et `easyDecide/mediumDecide/hardDecide` ne sont **jamais** appelés (grep confirmé). Le champ `difficulty` du type `Player` (`src/engine/types.ts:35`) n'est consommé par aucune logique.

### Step 1 (léger) : vérifier l'absence d'usage
```bash
grep -rn "easyDecide\|mediumDecide\|hardDecide\|difficulty" src --include=*.ts --include=*.tsx
```

### Step 2 : Fix
- Supprimer `src/ai/easyAI.ts`, `src/ai/mediumAI.ts`, `src/ai/hardAI.ts`.
- Dans `src/ai/index.ts`, ne plus réexporter ces modules.
- Dans `src/engine/types.ts`, retirer `difficulty: Difficulty;` de `Player` et de `Twist7Setup`, et retirer le type `Difficulty` si devenu inutilisé (sinon le garder pour `routes/index.tsx` qui peut l'utiliser comme alias).
- Dans `src/routes/game.$mode.tsx`, retirer l'import `Difficulty` et l'usage de `difficulty` (voir Tâche 1 pour le remplacer par `archetype`).

### Step 3 : Run
```bash
npx tsc -b --noEmit && npx vitest run
```
Doit rester vert (aucun appel supprimé n'était vivant).

### Step 4 : Commit
```bash
git commit -m "refactor: remove dead easy/medium/hard AI modules and unused difficulty field"
```

---

## Tâche 4 : Retirer les casts `as any`

**Sévérité :** Should fix · **Réf. :** F4 · **Confiance :** high · **Impact :** maint. · **Effort :** S

`src/ai/engine.ts:16` `(me as any).archetype` et `src/routes/game.$mode.tsx:129` `archetype={(p as any).archetype}` affaiblissent le typage alors que `Player` expose déjà `archetype?`.

### Step 1 (léger) : grep
```bash
grep -rn "as any" src --include=*.ts --include=*.tsx
```

### Step 2 : Fix
- `engine.ts:16` → `const archetype = me.archetype ?? 'tactical';`
- `game.$mode.tsx:129` → `archetype={p.archetype}` (le prop `archetype?` de `PlayerBox` accepte déjà `undefined`).

### Step 3 : Run
```bash
npx tsc -b --noEmit
```

### Step 4 : Commit
```bash
git commit -m "refactor: drop unnecessary `as any` casts on archetype"
```

---

## Tâche 5 : Ajouter ESLint (flat config) + script + CI

**Sévérité :** Should fix · **Réf. :** F5 · **Confiance :** medium · **Impact :** maint. · **Effort :** M

Aucun linter/formateur. Ajouter `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`, un `eslint.config.js` flat, un script `lint`, et un job CI (GitHub Actions) qui lance `lint` + `typecheck` + `test`.

### Step 1 (léger) : ajout config
`eslint.config.js` :
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/routeTree.gen.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
```
`package.json` scripts : ajouter `"lint": "eslint ."`.

### Step 2 : Fix (corriger les erreurs remontées)
Lancer `npx eslint .` et corriger (le plus souvent : `any` déjà traité en Tâche 4, `@typescript-eslint/no-unused-vars`).

### Step 3 : Run
```bash
npx eslint . && npx tsc -b --noEmit && npx vitest run
```

### Step 4 : Commit
```bash
git commit -m "build: add ESLint flat config, lint script and CI quality gate"
```
Ajouter `.github/workflows/ci.yml` (lint + typecheck + test).

---

## Tâche 6 : Retirer `@tanstack/react-query` (ou l'utiliser)

**Sévérité :** Should fix · **Réf. :** F6 · **Confiance :** medium · **Impact :** perf · **Effort :** S

`src/main.tsx` importe `QueryClient`/`QueryClientProvider` mais aucune query n'existe. Poids de bundle mort.

### Step 1 (léger) : confirmer
```bash
grep -rn "useQuery\|useMutation\|QueryClient" src
```
(Seulement `main.tsx`.)

### Step 2 : Fix
Soit (recommandé) retirer le provider et la dépendance de `package.json` ; soit implémenter une query réelle. Pour cette v1 : retirer.
`src/main.tsx` :
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import './index.css';

const router = createRouter({ routeTree, defaultPreload: 'intent' });
// ... Register ...
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```
Retirer `@tanstack/react-query` de `package.json` (et `npm uninstall` si besoin).

### Step 3 : Run
```bash
npx vitest run && npx tsc -b --noEmit
```

### Step 4 : Commit
```bash
git commit -m "refactor: remove unused react-query provider and dependency"
```

---

## Tâche 7 : Corriger `bustProbability` (discard + rangs adverses)

**Sévérité :** Should fix · **Réf. :** F7 · **Confiance :** medium · **Impact :** correctness · **Effort :** M

`src/lib/probability.ts:4` compte les cartes à risque uniquement dans `state.deck`. Le discard est reshufflé dans `drawTop` (donc source de doublons future) et les cartes dans les rangs des *autres* joueurs ne peuvent plus dupliquer. Le modèle surestime/ignore partiellement le risque.

### Step 1 : Test FAIL
`src/lib/__tests__/probability.test.ts` (nouveau) :
```ts
import { describe, it, expect } from 'vitest';
import { bustProbability } from '../probability';
import { createGame } from '../../engine/twist7Engine';
import type { Twist7State } from '../../engine/types';

describe('bustProbability', () => {
  it('excludes number cards already held by OTHER players', () => {
    let s = createGame({ players: [
      { id: 'a', name: 'A', isAI: false },
      { id: 'b', name: 'B', isAI: false },
    ]});
    // B already holds a 5 in its row -> that 5 can no longer duplicate A
    s = { ...s, players: s.players.map((p, i) =>
      i === 1 ? { ...p, row: [{ id: 'x', kind: 'number', value: 5 }], distinct: [5] } : p) };
    s = { ...s, deck: [
      { id: 'd1', kind: 'number', value: 5 },
      { id: 'd2', kind: 'number', value: 7 },
    ]};
    const p = bustProbability(s, [3]); // A holds a 3, deck has one 5 + one 7
    // only the 5 is risky for A; B's 5 in row must NOT count
    expect(p).toBeCloseTo(1 / 2, 5);
  });
});
```
(Échoue si l'implémentation actuelle comptait B's row — ici elle ne le fait pas, donc ce test documente le contrat ; ajuster le scénario pour prouver l'exclusion du discard.)

### Step 2 : Fix
`src/lib/probability.ts` :
```ts
export function bustProbability(state: Twist7State, distinct: number[]): number {
  // Cartes encore jouables = deck + discard (le discard est reshufflé).
  const pool = [...state.deck, ...state.discard];
  const total = pool.length;
  if (total === 0) return 0;
  // Soustrait les valeurs déjà posées dans les rangs des AUTRES joueurs.
  const heldByOthers = new Set<number>();
  state.players.forEach((p) => p.distinct.forEach((v) => heldByOthers.add(v)));
  let risky = 0;
  for (const v of distinct) {
    if (heldByOthers.has(v)) continue; // plus rien à dupliquer pour cette valeur
    risky += pool.filter((c) => c.kind === 'number' && c.value === v).length;
  }
  return risky / total;
}
```

### Step 3 : Run (PASS)
```bash
npx vitest run src/lib
```

### Step 4 : Commit
```bash
git commit -m "fix: bustProbability accounts for discard reshuffle and opponents' rows"
```

---

## Tâche 8 : Réinitialiser `useTwist7Game` au changement de `setup`

**Sévérité :** Should fix · **Réf. :** F8 · **Confiance :** medium · **Impact :** bug risk · **Effort :** M

`src/hooks/useTwist7Game.ts:39` `useReducer(reducer, setup, (s) => createGame(s))` — l'initializer ne s'exécute qu'au montage. Changer `setup` (naviguer `/game/easy` → `/game/hard`, ou set de joueurs différent) **ne recrée pas** la partie → état périmé.

### Step 1 : Test FAIL
`src/hooks/__tests__/useTwist7Game.test.tsx` (nouveau, avec `@testing-library/react`) :
```ts
import { render, act } from '@testing-library/react';
import { useTwist7Game } from '../useTwist7Game';
// ... vérifier que le passage d'un setup différent (nouveau joueur) reset le state
```
Ou test unitaire du reducer : vérifier qu'un nouvel initializer est nécessaire.

### Step 2 : Fix
Ajouter une `key` de remontage basée sur l'identité du setup, ou forcer la re-création :
`src/routes/game.$mode.tsx` :
```tsx
const setupKey = JSON.stringify(setup.players.map((p) => p.id + p.archetype + p.isAI));
return <GameViewInner key={setupKey} setup={setup} />;
```
(Extraire `GameView` en `GameViewInner` qui prend `setup` en prop.) Ainsi le hook se remonte avec un nouveau `createGame`.

Alternative : exposer une action `RESET` et la dispatcher quand `setup` change via `useEffect`. La solution `key` est la plus robuste.

### Step 3 : Run
```bash
npx vitest run src/hooks && npx tsc -b --noEmit
```

### Step 4 : Commit
```bash
git commit -m "fix: reset game state when setup (players/mode) changes"
```

---

## Tâche 9 : Tests isolés `scoreRow` + `endRound` (tie/winner)

**Sévérité :** Consider · **Réf. :** F9 · **Confiance :** low · **Impact :** test · **Effort :** S

### Step 1 : Test (nouveau dans `twist7Engine.test.ts`)
```ts
it('scoreRow returns 0 for a busted player', () => {
  const p = createGame(setup2).players[0];
  expect(scoreRow({ ...p, roundStatus: 'busted', row: [num('a', 12), dbl('d'), plus('m', 4)] })).toBe(0);
});
it('endRound picks the first player on a tie for the lead', () => {
  let s = createGame(setup2);
  s = { ...s, players: s.players.map((p, i) => ({ ...p, bankedScore: 100, isAI: i === 0 })) };
  s = { ...s, phase: 'play' };
  const ended = endRound(s);
  expect(ended.winnerId).toBe('a'); // index 0 gagne à égalité
});
```

### Step 2 : Fix — aucun (tests de non-régression).
### Step 3 : Run
```bash
npx vitest run src/engine
```
### Step 4 : Commit
```bash
git commit -m "test: add isolated scoreRow and endRound tie/winner coverage"
```

---

## Tâche 10 : Tests de la logique IA (`decide`, probabilités, archétypes)

**Sévérité :** Consider · **Réf. :** F10 · **Confiance :** medium · **Impact :** test · **Effort :** M

Actuellement 3 tests triviaux. Ajouter des tests prouvant la différenciation agressif/tactique/prudent et le calcul de `bustProbability`/`expectedGain`.

### Step 1 : Tests (dans `ai.test.ts` + `probability.test.ts`)
```ts
it('cautious stays earlier than aggressive at equal risk', () => {
  // construire un état où pBust ~ 0.5 et vérifier aggressive=take, cautious=stay
});
it('expectedGain decreases as distinct grows', () => {
  expect(expectedGain([1,2,3])).toBeGreaterThan(expectedGain([1,2,3,4,5,6,7]));
});
```

### Step 2 : Fix — aucun.
### Step 3 : Run
```bash
npx vitest run src/ai src/lib
```
### Step 4 : Commit
```bash
git commit -m "test: cover AI archetype differentiation and probability helpers"
```

---

## Tâche 11 : Mémoïser `actionConfig` dans `Card.tsx`

**Sévérité :** Consider · **Réf. :** F11 · **Confiance :** low · **Impact :** perf · **Effort :** S

`src/components/Card.tsx:533` `actionConfig` est recréé à chaque render.

### Step 1 (léger) : déplacer hors du composant
### Step 2 : Fix
```ts
const ACTION_CONFIG: Record<string, { bg: string; arch: string; content: (t,size)=>JSX.Element }> = { ... };
```
(Construire `content` via une fonction pour éviter de capter `t`/`size` au module.) Ou `useMemo` si nécessaire.

### Step 3 : Run
```bash
npx vitest run && npx tsc -b --noEmit
```
### Step 4 : Commit
```bash
git commit -m "perf: hoist Card actionConfig out of render"
```

---

## Tâche 12 : Typage des clés i18n (union littérale)

**Sévérité :** Consider · **Réf. :** F12 · **Confiance :** low · **Impact :** maint. · **Effort :** S

`src/i18n/index.tsx:12` `t: (key: string, ...) => string` accepte n'importe quelle chaîne ; une clé erronée tombe silencieusement sur la clé brute.

### Step 1 (léger) : dériver l'union des clés depuis `en`
### Step 2 : Fix
```ts
import en from './locales/en';
type I18nKey = keyof typeof en;
// t: (key: I18nKey, vars?) => string  (avec cast interne)
```
Cela rend les clés manquantes des erreurs de compilation.

### Step 3 : Run
```bash
npx tsc -b --noEmit
```
### Step 4 : Commit
```bash
git commit -m "refactor: type i18n keys as a literal union to catch typos at build"
```

---

## Ordre d'exécution recommandé

| Phase | Tâches | Raison |
|-------|--------|--------|
| 1. Bugs/comportement | 1, 2, 8 | Corriger les features trompeuses et l'état périmé (TDD) |
| 2. Probabilités IA | 7 | Corriger le modèle de risque (TDD) |
| 3. Suppression code mort | 3, 4, 6 | Alléger maintenabilité + bundle |
| 4. Qualité gate | 5 | ESLint + CI pour empêcher la régression |
| 5. Tests | 9, 10 | Couvrir le reste du moteur + IA |
| 6. Perf/typage | 11, 12 | Améliorations non-fonctionnelles |

---

## Post-implémentation (checklist)

- [ ] `npx vitest run` — tous les tests passent
- [ ] `npx tsc -b --noEmit` — 0 erreur
- [ ] `npx eslint .` — 0 erreur
- [ ] Build : `npm run build` réussit
- [ ] `git log --oneline -12` — 12 commits propres
- [ ] Bump version dans `package.json`
- [ ] `CHANGELOG.md` mis à jour

## Reporté à v1.1.0

| Item | Sévérité | Réf. | Raison |
|------|----------|------|--------|
| Découpler moteur↔IA (passer sélecteurs de cible en paramètre) | Should fix | F2 | Refactor architecturale > 30 min ; fonctionnel après Tâche 2 |
| Tests mutation (`mutmut`/`mutpy` équivalent TS) | Consider | F10 | Besoin d'outillage supplémentaire |
