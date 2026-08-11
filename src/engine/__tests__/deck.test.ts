import { describe, it, expect } from 'vitest';
import { buildDeck, shuffle, DEFAULT_DECK_CONFIG } from '../deck';

describe('deck', () => {
  it('buildDeck returns correct total size', () => {
    const deck = buildDeck();
    const expected =
      Object.values(DEFAULT_DECK_CONFIG.numberCopies).reduce((a, b) => a + b, 0) +
      DEFAULT_DECK_CONFIG.modifiers.plus.length +
      DEFAULT_DECK_CONFIG.modifiers.double +
      DEFAULT_DECK_CONFIG.actions.freeze +
      DEFAULT_DECK_CONFIG.actions.twistThree +
      DEFAULT_DECK_CONFIG.actions.secondChance;
    expect(deck).toHaveLength(expected);
    expect(deck).toHaveLength(94);
  });

  it('buildDeck respects number copies per value', () => {
    const deck = buildDeck();
    const numbers = deck.filter(c => c.kind === 'number') as { value: number }[];
    const counts = new Map<number, number>();
    for (const c of numbers) {
      counts.set(c.value, (counts.get(c.value) ?? 0) + 1);
    }
    for (let v = 0; v <= 12; v++) {
      const expected = DEFAULT_DECK_CONFIG.numberCopies[v];
      expect(counts.get(v)).toBe(expected);
    }
  });

  it('buildDeck contains correct modifiers', () => {
    const deck = buildDeck();
    const modifiers = deck.filter(c => c.kind === 'modifier');
    const plus = modifiers.filter(m => m.modifier === 'plus').length;
    const double = modifiers.filter(m => m.modifier === 'double').length;
    expect(plus).toBe(DEFAULT_DECK_CONFIG.modifiers.plus.length);
    expect(double).toBe(DEFAULT_DECK_CONFIG.modifiers.double);
  });

  it('buildDeck contains correct actions', () => {
    const deck = buildDeck();
    const actions = deck.filter(c => c.kind === 'action');
    const freeze = actions.filter(a => a.action === 'freeze').length;
    const twistThree = actions.filter(a => a.action === 'twistThree').length;
    const secondChance = actions.filter(a => a.action === 'secondChance').length;
    expect(freeze).toBe(DEFAULT_DECK_CONFIG.actions.freeze);
    expect(twistThree).toBe(DEFAULT_DECK_CONFIG.actions.twistThree);
    expect(secondChance).toBe(DEFAULT_DECK_CONFIG.actions.secondChance);
  });

  it('shuffle returns new array and preserves elements', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect(out.slice().sort()).toEqual(input.slice().sort());
  });

  it('shuffle does not mutate original array', () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });
});
