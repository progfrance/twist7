import { describe, it, expect } from 'vitest';
import { scoreRow } from '../twist7Engine';
import { Player, Card } from '../types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Test',
    isAI: false,
    bankedScore: 0,
    row: [],
    distinct: [],
    roundScore: 0,
    roundStatus: 'active',
    secondChance: false,
    twistThree: false,
    twistSeven: false,
    ...overrides,
  };
}

const numberCard = (value: number): Card => ({ id: `n${value}`, kind: 'number', value });
const plusCard = (amount: number): Card => ({ id: `p${amount}`, kind: 'modifier', modifier: 'plus', amount });
const doubleCard = (): Card => ({ id: 'd1', kind: 'modifier', modifier: 'double', amount: 2 });

describe('selectors', () => {
  describe('scoreRow', () => {
    it('returns 0 for busted player', () => {
      const p = makePlayer({ roundStatus: 'busted', row: [numberCard(5)] });
      expect(scoreRow(p)).toBe(0);
    });

    it('sums number cards', () => {
      const p = makePlayer({ row: [numberCard(3), numberCard(4), numberCard(5)] });
      expect(scoreRow(p)).toBe(12);
    });

    it('applies double modifier', () => {
      const p = makePlayer({ row: [numberCard(3), numberCard(4), doubleCard()] });
      expect(scoreRow(p)).toBe((3 + 4) * 2);
    });

    it('adds plus modifiers', () => {
      const p = makePlayer({ row: [numberCard(2), plusCard(4), plusCard(6)] });
      expect(scoreRow(p)).toBe(2 + 4 + 6);
    });

    it('combines double and plus', () => {
      const p = makePlayer({ row: [numberCard(5), doubleCard(), plusCard(4)] });
      expect(scoreRow(p)).toBe(5 * 2 + 4);
    });

    it('adds Twist7 bonus', () => {
      const p = makePlayer({ row: [numberCard(1)], twistSeven: true });
      expect(scoreRow(p)).toBe(1 + 15);
    });
  });
});
