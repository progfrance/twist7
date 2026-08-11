import { Twist7State, Card } from '../types';

function addCardToRow(state: Twist7State, idx: number, card: Card): Twist7State {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === idx ? { ...p, row: [...p.row, card] } : p,
    ),
  };
}

export function handleModifierCard(state: Twist7State, idx: number, card: Extract<Card, { kind: 'modifier' }>): Twist7State {
  return addCardToRow(state, idx, card);
}
