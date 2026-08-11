# engine/

Moteur de jeu pur Twist7. Aucune dépendance React.

## Structure
- `types.ts` : modèles domaine
- `deck.ts` : construction et shuffle du deck
- `twist7Engine.ts` : machine à états
- `__tests__/` : tests Vitest

## Invariants
- Immutabilité : toutes les fonctions renvoient un nouvel état.
- `distinct` est dérivé de `row` et maintenu trié.
- Deck + discard forment le pool invisible.

## Ajouter un type de carte
1. Étendre `src/engine/types.ts`
2. Mettre à jour `buildDeck` dans `deck.ts`
3. Ajouter handler dans `twist7Engine.ts` `applyDrawnCard`
4. Ajouter tests

## Tests
`npm run test` couvre engine, deck, selectors.
