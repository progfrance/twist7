import { describe, it, expect } from 'vitest';
import { defaultSetup } from '../routes/gameSetup';

describe('defaultSetup', () => {
  it('maps an archetype mode to that archetype', () => {
    expect(defaultSetup('aggressive').players[1].archetype).toBe('aggressive');
    expect(defaultSetup('tactical').players[1].archetype).toBe('tactical');
    expect(defaultSetup('cautious').players[1].archetype).toBe('cautious');
  });

  it('falls back to tactical for unknown / legacy difficulty modes', () => {
    expect(defaultSetup('easy').players[1].archetype).toBe('tactical');
    expect(defaultSetup('hard').players[1].archetype).toBe('tactical');
    expect(defaultSetup('bogus').players[1].archetype).toBe('tactical');
  });

  it('always builds one human and one AI player', () => {
    const s = defaultSetup('tactical');
    expect(s.players).toHaveLength(2);
    expect(s.players[0].isAI).toBe(false);
    expect(s.players[1].isAI).toBe(true);
  });
});
