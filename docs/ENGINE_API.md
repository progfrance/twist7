# ENGINE_API.md – Documentation publique du moteur Twist7

## Vue d’ensemble
Le moteur est pur TypeScript, sans dépendance React. Il modélise l’état du jeu de façon immutable via `Twist7State`.

## Types principaux

### Card
```ts
type Card = NumberCard | ModifierCard | ActionCard
```
- `NumberCard { id, kind:'number', value:0..12 }`
- `ModifierCard { id, kind:'modifier', modifier:'plus'|'double', amount }`
- `ActionCard { id, kind:'action', action:'freeze'|'twistThree'|'secondChance' }`

### Player
```ts
interface Player {
  id:string, name:string, isAI:boolean, archetype?: 'aggressive'|'tactical'|'cautious'
  bankedScore:number
  row:Card[]
  distinct:number[]
  roundScore:number
  roundStatus:'active'|'stayed'|'busted'|'frozen'
  secondChance:boolean
  twistThree:boolean
  twistSeven:boolean
}
```

### Twist7State
Contient `players`, `deck`, `discard`, `dealerIndex`, `currentIndex`, `phase`, `roundNumber`, `targetScore`, `winnerId`, `pendingFreeze`, `pendingSecondChance`, `history`.

## API publique

### Création et cycle de jeu
- `createGame(setup: Twist7Setup, targetScore=200): Twist7State`
  Initialise l’état.
- `startRound(state): Twist7State`
  Réinitialise les joueurs, distribue une carte à chacun, passe en phase `play`.
- `takeCard(state): Twist7State`
  Joueur courant pioche, résout effet, avance le tour.
- `stay(state): Twist7State`
  Joueur bancaire, retire du tour.
- `nextRound(state): Twist7State`
  Discarde, tourne dealer, remet à zéro.
- `endRound(state): Twist7State`
  Score, history, détection fin de partie.

### Scoring et sélecteurs
- `scoreRow(p: Player): number`
  Somme numéros, applique x2 puis + bonus, +15 Twist7. Retourne 0 si busted.
- `TWIST7_DISTINCT_COUNT = 7`

### Résolution d’actions
- `resolveSecondChance(state, useIt:boolean): Twist7State`
- `resolveFreeze(state, targetIdx:number): Twist7State`

## Exemple minimal

```ts
import { createGame, startRound, takeCard, stay } from './src/engine/twist7Engine';

let state = createGame({
  players: [
    { id:'h1', name:'Vous', isAI:false },
    { id:'ai1', name:'IA', isAI:true, archetype:'tactical' }
  ]
});
state = startRound(state);
state = takeCard(state); // vous piochez
state = stay(state);     // vous vous arrêtez
```

## Cycle de vie d’une manche
1. `startRound` : distribution
2. Tour par tour : `takeCard` ou `stay`
3. Événements : Freeze → `pendingFreeze`, duplicate + Second Chance → `pendingSecondChance`
4. Fin : Twist7 ou plus aucun actif → `endRound`

## Invariants
- État immutable : chaque fonction renvoie un nouvel état.
- `distinct` est trié et dérivé de `row`.
- Le deck est reshufflé depuis `discard` quand vide.
