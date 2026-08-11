import { describe, it, expect } from 'vitest';
import { PROFILE_BEHAVIOR } from '../behavior';
import type { Archetype } from '../types';

describe('AI behavior', () => {
  it('PROFILE_BEHAVIOR contains all archetypes', () => {
    const archetypes: Archetype[] = ['aggressive', 'tactical', 'cautious'];
    for (const a of archetypes) {
      expect(PROFILE_BEHAVIOR[a]).toBeDefined();
    }
  });

  it('aggressive targets weakest and has high Twist7 urgency', () => {
    const b = PROFILE_BEHAVIOR.aggressive;
    expect(b.freezeTarget).toBe('weakest');
    expect(b.twistThreeTarget).toBe('weakest');
    expect(b.twistSevenUrgency).toBeGreaterThan(0.8);
  });

  it('tactical targets strongest', () => {
    const b = PROFILE_BEHAVIOR.tactical;
    expect(b.freezeTarget).toBe('strongest');
    expect(b.twistThreeTarget).toBe('strongest');
  });

  it('cautious targets self for Twist Three', () => {
    const b = PROFILE_BEHAVIOR.cautious;
    expect(b.twistThreeTarget).toBe('self');
    expect(b.twistSevenUrgency).toBeLessThan(0.4);
  });
});
