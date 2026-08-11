import { Twist7State, Card } from '../types';
import { addCardToRow, addDistinct, bustPlayer, consumeSecondChance, twistSeven } from '../twist7Engine';
import { TWIST7_DISTINCT_COUNT } from '../twist7Engine';

export function handleNumberCard(state: Twist7State, idx: number, card: Extract<Card, { kind: 'number' }>): Twist7State {
  let s = addCardToRow(state, idx, card);
  const p = s.players[idx];
  if (p.distinct.includes(card.value)) {
    if (p.secondChance) return consumeSecondChance(s, idx);
    return bustPlayer(s, idx);
  }
  s = addDistinct(s, idx, card.value);
  if (s.players[idx].distinct.length >= TWIST7_DISTINCT_COUNT) return twistSeven(s, idx);
  return s;
}
