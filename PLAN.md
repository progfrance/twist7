# PLAN.md — Analyse complète du projet Twist7

**Date d'analyse :** 2026-08-10  
**Projet :** Twist7 — Implémentation web du jeu de cartes Twist7  
**Branche :** master  
**Stack :** React 18 + TypeScript 5 + Vite 6 + TanStack Router 1.78 + Tailwind CSS 4 + Vitest

---

## 1. Synthèse exécutive

Twist7 est une SPA moderne implémentant fidèlement le jeu de cartes « Stop ou Encore » Twist7. L'architecture sépare clairement le **moteur de jeu pur TypeScript** `src/engine/` de la couche UI React. L'IA multi-profils, l'i18n trilingue et le routage fichier-based sont opérationnels. La base de tests Vitest couvre le moteur et l'IA, CI GitHub Actions est en place.

**Points forts :**
- Moteur pur, immutable, testé, conforme aux règles officielles.
- IA paramétrable avec profils aggressive/tactical/cautious et logique de risque basée sur la probabilité de bust.
- UI responsive avec TanStack Router, Tailwind CSS 4, composants réutilisables.
- i18n FR/EN/ES avec typage strict des clés.

**Points d'attention :**
- Complexité croissante du moteur avec états pendingFreeze/pendingSecondChance.
- Absence de tests d'intégration UI / E2E.
- Documentation API du moteur limitée à l'implémentation.
- Pas d'audit de sécurité dépendances ni de benchmarks perf.

---

## 2. Vue d'ensemble technique

### 2.1 Dépendances principales
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@tanstack/react-router": "^1.78.0",
  "@tanstack/router-devtools": "^1.78.0",
  "typescript": "^5.6.3",
  "vite": "^6.0.3",
  "tailwindcss": "^4.0.0",
  "@tailwindcss/vite": "^4.0.0",
  "vitest": "^2.1.8",
  "eslint": "^9.39.5"
}
```
`type: "module"` activé.

### 2.2 Scripts npm
- `dev` : vite
- `build` : tsc -b && vite build
- `preview` : vite preview
- `test` : vitest run
- `test:watch` : vitest
- `typecheck` : tsc -b --noEmit
- `lint` : eslint .

### 2.3 Configuration
- `vite.config.ts` : plugins TanStackRouterVite, react, tailwindcss. Port 5173.
- `tsconfig.json` référence `tsconfig.app.json` et `tsconfig.node.json`.
- `eslint.config.js` ESLint 9 avec typescript-eslint, react-hooks, react-refresh.

---

## 3. Architecture et structure

```
src/
  engine/        # Moteur pur, sans React
  ai/            # Logique IA et profils
  components/    # UI React
  hooks/         # useTwist7Game, useAiMove
  i18n/          # Traductions
  routes/        # TanStack Router fichier-based
  lib/           # Utils gameSetup, probability
```

Flux de données :
`routes/game.$mode.tsx` → `useTwist7Game` reducer → `engine/twist7Engine.ts` → `components/*`

Le `routeTree.gen.ts` est généré automatiquement par `@tanstack/router-plugin`.

---

## 4. Moteur de jeu — src/engine

### 4.1 Modèle domaine
- `Card` union : NumberCard 0-12, ModifierCard plus/double, ActionCard freeze/twistThree/secondChance.
- `Player` : id, name, isAI, archetype, bankedScore, row, distinct[], roundScore, roundStatus, secondChance, twistThree, twistSeven.
- `Twist7State` immutable avec deck, discard, dealerIndex, currentIndex, phase, roundNumber, targetScore, winnerId, pendingFreeze, pendingSecondChance, history.

### 4.2 Composition du deck
Par `DEFAULT_DECK_CONFIG` :
- 79 cartes numéros : 0×1 + v copies pour 1..12 = 79
- 6 bonus : +2,+4,+6,+8,+10 et 1× x2
- 9 actions : 3 Freeze, 3 Second Chance, 3 Twist Three
Total 94 cartes.

### 4.3 Fonctions clés
- `createGame(setup, targetScore=200)` : initialise état.
- `startRound` : remet à zéro joueurs, distribution 1 carte/joueur avec résolution actions.
- `takeCard` : pioche, gère duplicate + Second Chance, Freeze, Twist Three.
- `stay` : joueur se retire, score sécurisé.
- `scoreRow` : somme numéros × x2 + plus + 15 Twist7.
- `endRound` : calcule scores, crée history, détecte gameOver ≥200.
- `nextRound` : purge mains, rotation dealer, reshuffle discard si pile vide.

Règles implémentées : Twist 7 à 7 numéros distincts → fin immédiate +15, Freeze force stop, Second Chance annule bust, reshuffle discard.

Qualité : fonctions pures, immutabilité via spread, pas d'effets secondaires. États pending gèrent interactions humaines.

---

## 5. Système IA — src/ai

Profils définis dans `ai/profiles/`:
- aggressive, cautious, tactical.

Comportement via `PROFILE_BEHAVIOR` :
- freezeTarget : weakest/strongest
- twistThreeTarget : weakest/strongest/self
- twistSevenUrgency : 0.9 / 0.6 / 0.3

`engine.ts decide(state)` :
- calcule `bustProbability` via lib/probability.
- threshold = profile.maxBustRisk
- ajustement si `distinct.length >= 6` : threshold + twistSevenUrgency
- renvoie 'take' si pBust < ajusté, sinon 'stay'.

Tests couvrent non-bust vide, seuils par archetype, expectedGain, Twist-7 urgency.

---

## 6. Frontend et composants

Composants :
- Card, DeckPile, GameHub, PlayerBox, ScoreTable, RulesModal, LanguageSwitcher.

Hooks :
- `useTwist7Game` : useReducer sur actions START_ROUND, TAKE, STAY, NEXT_ROUND, RESOLVE_SECOND_CHANCE, RESOLVE_FREEZE.
- `useAiMove` : déclenche décision IA.

UI responsive : layout côte-à-côte pour 2 joueurs, grille pour 3+.

---

## 7. Internationalisation

`src/i18n/index.tsx` + locales `en.ts`, `fr.ts`, `es.ts`.  
Refactor récent pour typage strict des clés statiques + escape hatch dynamique. Support complet des règles et UI.

---

## 8. Tests et qualité

Tests Vitest :
- `src/__tests__/gameSetup.test.ts` : mapping modes → AI, fallback tactical.
- `src/ai/__tests__/ai.test.ts` : décide, thresholds, Twist-7 urgency.
- `src/engine/__tests__/twist7Engine.test.ts` : deck composition, deal, Freeze, bust, Twist7, scoring, nextRound, Second Chance, history.
- `src/lib/__tests__/probability.test.ts` : bustProbability avec discard.

CI GitHub Actions `.github/workflows/ci.yml` :
- push/PR sur master → checkout, Node 20, npm ci, lint, typecheck, test.

Lint ESLint 9 actif, règles react-hooks et react-refresh.

---

## 9. Dépendances et outils

- `run.bat` pour démarrage Windows.
- Pas de dépendances Python.
- node_modules non versionné.

Risques : versions React 18 anciennes vs React 19, Tailwind 4 en alpha stable.

---

## 10. Dette technique et risques

1. **Complexité moteur** : `twist7Engine.ts` > 600 lignes, gestion de plusieurs effets imbriqués. Lisibilité à surveiller.
2. **États pending** : pendingFreeze / pendingSecondChance couplés à UI, risque d'états incohérents.
3. **Tests UI absents** : aucun test React Testing Library / Playwright.
4. **Documentation API** : fonctions engine non documentées via JSDoc.
5. **Performance** : shuffle aléatoire à chaque buildDeck, pas de memoisation des calculs probabilité.
6. **Accessibilité** : composants non audités ARIA.

---

## 11. Recommandations prioritaires

1. **Tests** : ajouter suite d'intégration pour flows complets round → endGame. Couvrir edge cases Freeze auto.
2. **Documentation** : JSDoc sur API engine, README technique.
3. **Refactor moteur** : extraire handlers par type de carte dans modules dédiés.
4. **Tests UI** : introduire React Testing Library pour GameHub/PlayerBox.
5. **Sécurité dépendances** : ajouter audit npm ci et mise à jour régulière.
6. **Perf** : memoiser bustProbability, éviter recalculs inutiles dans decide.
7. **Accessibilité** : audits axe-core, labels ARIA sur cartes interactives.

---

## 12. Annexes

Commandes utiles :
```bash
npm install
npm run dev      # http://localhost:5173
npm run test
npm run build
npm run lint
npm run typecheck
```

Fichiers clés :
- `src/main.tsx` bootstrap RouterProvider
- `src/routes/__root.tsx` layout
- `src/routes/game.$mode.tsx` vue jeu
- `src/engine/twist7Engine.ts` cœur du jeu
- `src/ai/engine.ts` décision IA

---

*Analyse générée automatiquement dans le cadre de l'audit complet du projet Twist7.*
