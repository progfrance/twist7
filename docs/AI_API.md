# AI_API.md – Documentation du système IA Twist7

## Vue d’ensemble
L’IA est découplée du moteur. Elle décide de `take` ou `stay` à partir de l’état et utilise `bustProbability` pour estimer le risque.

## Types
- `Archetype = 'aggressive' | 'tactical' | 'cautious'`
- `AIProfile { maxBustRisk(state, me): number }`

## Comportement par archetype
Défini dans `src/ai/behavior.ts` via `PROFILE_BEHAVIOR`.

- `aggressive`
  - `freezeTarget: 'weakest'`
  - `twistThreeTarget: 'weakest'`
  - `twistSevenUrgency: 0.9`
  - Prend plus de risques, pousse le Twist7.

- `tactical`
  - `freezeTarget: 'strongest'`
  - `twistThreeTarget: 'strongest'`
  - `twistSevenUrgency: 0.6`
  - Cible le leader.

- `cautious`
  - `freezeTarget: 'strongest'`
  - `twistThreeTarget: 'self'`
  - `twistSevenUrgency: 0.3`
  - Évite le risque, prend Twist Three sur soi.

## API publique
- `decide(state: Twist7State): 'take' | 'stay'`
  Retourne la décision du joueur courant.
  Logique :
  1. Si score = 0 → `take`
  2. Calcul `pBust = bustProbability(state, me.distinct)`
  3. `threshold = profile.maxBustRisk(state, me)`
  4. Si `distinct.length >= 6` → `threshold += twistSevenUrgency`
  5. `take` si `pBust < adjusted`, sinon `stay`

## Intégration
Le hook `useAiMove` appelle `decide` puis déclenche `take` ou `stay` via le reducer du moteur.

## Exemple
```ts
import { decide } from './src/ai/engine';
const action = decide(state); // 'take' | 'stay'
```

## Extensibilité
Ajouter un profil :
1. Créer `src/ai/profiles/myProfile.ts` exportant `maxBustRisk`
2. Ajouter entrée dans `PROFILE_BEHAVIOR`
