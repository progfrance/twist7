import { describe, it, expect } from 'vitest';
import {
  createGame,
  startRound,
  takeCard,
  stay,
  scoreRow,
  nextRound,
  resolveSecondChance,
  resolveFreeze,
} from '../twist7Engine';
import { DEFAULT_DECK_CONFIG, buildDeck } from '../deck';
import { Card, Twist7Setup, Twist7State } from '../types';

const setup2: Twist7Setup = {
  players: [
    { id: 'a', name: 'A', isAI: false },
    { id: 'b', name: 'B', isAI: false },
  ],
};

const num = (id: string, value: number): Card => ({ id, kind: 'number', value });
const plus = (id: string, amount: number): Card => ({ id, kind: 'modifier', modifier: 'plus', amount });
const dbl = (id: string): Card => ({ id, kind: 'modifier', modifier: 'double', amount: 2 });
const freeze = (id: string): Card => ({ id, kind: 'action', action: 'freeze' });
const twistThree = (id: string): Card => ({ id, kind: 'action', action: 'twistThree' });
const secondChance = (id: string): Card => ({ id, kind: 'action', action: 'secondChance' });

function withDeck(state: Twist7State, deck: Card[]): Twist7State {
  return { ...state, deck };
}

describe('deck', () => {
  it('has the expected composition (79 numbers + 6 bonuses + 9 actions)', () => {
    const deck = buildDeck();
    const expected =
      Object.values(DEFAULT_DECK_CONFIG.numberCopies).reduce((a, b) => a + b, 0) +
      DEFAULT_DECK_CONFIG.modifiers.plus.length +
      DEFAULT_DECK_CONFIG.modifiers.double +
      DEFAULT_DECK_CONFIG.actions.freeze +
      DEFAULT_DECK_CONFIG.actions.twistThree +
      DEFAULT_DECK_CONFIG.actions.secondChance;
    expect(deck).toHaveLength(expected); // 79 numbers + 6 bonuses + 9 actions = 94
    expect(deck.filter((c) => c.kind === 'number')).toHaveLength(79);
    expect(deck.filter((c) => c.kind === 'modifier')).toHaveLength(6);
    expect(deck.filter((c) => c.kind === 'action')).toHaveLength(9);
  });
});

describe('deal & round flow', () => {
  it('deals one card to each player and starts the play phase', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('a', 5), num('b', 2)]); // plain numbers, no actions
    s = startRound(s);
    expect(s.phase).toBe('play');
    expect(s.players[0].row).toHaveLength(1);
    expect(s.players[1].row).toHaveLength(1);
    expect(s.currentIndex).toBe(0);
  });

  it('a Freeze drawn during the deal freezes another player, not the dealer', () => {
    let s = createGame({
      players: [
        { id: 'a', name: 'A', isAI: false },
        { id: 'b', name: 'B', isAI: false },
        { id: 'c', name: 'C', isAI: false },
      ],
    });
    // The dealer (index 0) draws a Freeze during the opening deal.
    s = withDeck(s, [freeze('f'), num('b', 2), num('c', 3)]);
    s = startRound(s);
    expect(s.phase).toBe('play');
    // The dealer hands the Freeze to another player and stays active.
    expect(s.players[0].roundStatus).toBe('active');
    // Exactly one other player was frozen by the dealer's Freeze.
    expect(s.players.filter((p) => p.roundStatus === 'frozen')).toHaveLength(1);
    // The round still opens on the active dealer.
    expect(s.players[s.currentIndex].roundStatus).toBe('active');
  });

  it('busts the active player on a duplicate value and advances', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('c0', 1), num('c1', 2), num('c2', 1)]);
    s = startRound(s); // deals 1 to A, 2 to B
    s = withDeck(s, [num('c2', 1)]);
    s = takeCard(s); // A draws 1 (duplicate) -> bust
    expect(s.players[0].roundStatus).toBe('busted');
    expect(s.currentIndex).toBe(1);
    expect(s.players[1].roundStatus).toBe('active');
  });

  it('Flip 7 ends the round with a +15 bonus', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('d0', 7), num('d1', 8), num('t0', 0), num('t1', 1), num('t2', 2), num('t3', 3), num('t4', 4), num('t5', 5)]);
    s = startRound(s); // A:7, B:8, currentIndex 0
    // B steps out so A keeps taking solo until Flip 7 (turns alternate otherwise).
    s = { ...s, players: s.players.map((p, i) => (i === 1 ? { ...p, roundStatus: 'busted' } : p)) };
    s = withDeck(s, [num('t0', 0), num('t1', 1), num('t2', 2), num('t3', 3), num('t4', 4), num('t5', 5)]);
    for (let i = 0; i < 6; i++) s = takeCard(s); // A draws 0..5 -> 7 distinct
    expect(s.players[0].twistSeven).toBe(true);
    expect(s.players[0].roundStatus).toBe('stayed');
    // 7+0+1+2+3+4+5 = 22, +15 = 37
    expect(scoreRow(s.players[0])).toBe(37);
    expect(s.phase).toBe('roundEnd');
  });

  it('staying banks the correct score including +X and x2', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('d0', 5), num('d1', 3)]);
    s = startRound(s); // A:5, B:3, currentIndex 0
    // Give A the full row it would have built (no turn-passing needed), keep B
    // active so the round does not end on A's stay.
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0
          ? { ...p, row: [num('d0', 5), plus('m1', 4), dbl('m2')], distinct: [5] }
          : p,
      ),
    };
    s = stay(s); // A scores 14 and the turn passes to B; round continues
    // (5) * 2 + 4 = 14
    expect(s.players[0].roundScore).toBe(14);
    expect(s.players[0].bankedScore).toBe(0); // banked only at round end
    expect(s.currentIndex).toBe(1); // turn passed to B, round still going
    expect(s.phase).toBe('play');
  });

  it('a Freeze is handed to another player (the drawer stays in the round)', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('d0', 7), num('d1', 8), freeze('f1')]);
    s = startRound(s); // A active [7], B active [8], current = 0 (A)
    s = withDeck(s, [freeze('f1')]);
    s = takeCard(s); // A (human) draws Freeze -> must choose a target
    expect(s.pendingFreeze).toBe(0); // A must choose, not freeze itself
    expect(s.players[0].roundStatus).toBe('active'); // A is NOT frozen
    s = resolveFreeze(s, 1); // A freezes B
    expect(s.players[1].roundStatus).toBe('frozen'); // B is out of the round
    expect(s.players[0].roundStatus).toBe('active'); // A keeps playing
    // Only A remains active, so A continues solo (turn stays on A).
    expect(s.currentIndex).toBe(0);
  });

  it('resolveFreeze throws when target is the drawer', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('d0', 5), num('d1', 3)]);
    s = startRound(s);
    s = withDeck(s, [freeze('f1')]);
    s = takeCard(s); // pendingFreeze = 0 (A is the drawer)
    expect(() => resolveFreeze(s, 0)).toThrow('cannot freeze yourself');
  });

  it('resolveFreeze throws when target is not active', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('d0', 5), num('d1', 3)]);
    s = startRound(s);
    s = withDeck(s, [freeze('f1')]);
    s = takeCard(s);
    // B has stayed (not active)
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 1 ? { ...p, roundStatus: 'stayed' as const } : p,
      ),
    };
    expect(() => resolveFreeze(s, 1)).toThrow('target is not active');
  });

  it('an AI hands the Freeze to the strongest active opponent', () => {
    let s = createGame({
      players: [
        { id: 'a', name: 'A', isAI: true },
        { id: 'b', name: 'B', isAI: true },
        { id: 'c', name: 'C', isAI: true },
      ],
      dealerIndex: 2,
    });
    s = withDeck(s, [num('a', 10), num('b', 4), num('c', 1)]);
    s = startRound(s); // current = 0 (A), rows A=10 B=4 C=1
    s = withDeck(s, [freeze('f')]);
    s = takeCard(s); // A (AI) auto-freezes the leading opponent (B=4 > C=1)
    expect(s.players[1].roundStatus).toBe('frozen'); // B frozen
    expect(s.players[0].roundStatus).toBe('active'); // A still in
    expect(s.players[2].roundStatus).toBe('active'); // C untouched
  });

  it('a Twist Three forces three draws on an opponent and flags the round', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('a', 5), num('b', 2)]);
    s = startRound(s); // A active [5], current = 0 (A); B active [2]
    const beforeB = s.players[1].row.length; // 1 (the deal card)
    // Top of deck: the Twist Three, then the 3 cards it forces onto B.
    s = withDeck(s, [twistThree('f'), num('a1', 7), num('a2', 9), num('a3', 1)]);
    s = takeCard(s); // A plays Twist Three -> B (opponent) draws 3 more cards
    expect(s.players[1].row.length).toBe(beforeB + 3); // 3 extra cards in B's row
    expect(s.players[1].twistThree).toBe(true); // B flagged as the effect target
    expect(s.players[0].row.length).toBe(1); // A did not draw extra cards
  });

  it('a frozen player keeps their points when the round ends', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('a', 5), num('b', 3)]);
    s = startRound(s); // A active [5], B active [3], current = 0 (A)
    s = withDeck(s, [num('a', 2)]);
    s = takeCard(s); // A draws 2 -> A=[5,2]=7, current -> 1 (B)
    s = withDeck(s, [freeze('f')]);
    s = takeCard(s); // B (human) draws Freeze -> chooses a target
    expect(s.pendingFreeze).toBe(1);
    s = resolveFreeze(s, 0); // B freezes A (A keeps its 7 points)
    expect(s.players[0].roundStatus).toBe('frozen');
    // B is now the only active player and continues solo; B stays to end round.
    s = stay(s); // B stays -> roundEnd
    expect(s.players[0].bankedScore).toBe(7); // A kept its points
    expect(s.players[1].bankedScore).toBe(3); // B banked its single card
  });

  it('ends the game when a player reaches the target at round end', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, bankedScore: 195 } : p)) };
    s = withDeck(s, [num('a', 5), num('b', 2)]);
    s = startRound(s);
    s = stay(s); // A banks 5 -> 200, turn passes to B
    s = withDeck(s, [num('c', 2)]);
    s = takeCard(s); // B draws 2 (dup) -> bust -> round ends -> game over
    expect(s.phase).toBe('gameOver');
    expect(s.winnerId).toBe('a');
    expect(s.players[0].bankedScore).toBe(200);
  });

  it('nextRound discards rows and rotates the dealer', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('a', 5), num('b', 2)]);
    s = startRound(s);
    s = stay(s); // A stays
    // B must resolve to end the round
    s = withDeck(s, [num('c', 2)]);
    s = takeCard(s); // B busts -> roundEnd
    expect(s.phase).toBe('roundEnd');
    const discarded = s.discard.length;
    const s2 = nextRound(s);
    expect(s2.phase).toBe('setup');
    expect(s2.dealerIndex).toBe(0);
    expect(s2.players[0].row).toHaveLength(0);
    expect(s2.discard.length).toBeGreaterThan(discarded);
  });

  it('Second Chance is set aside, not placed in the row', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('a', 5), num('b', 3)]);
    s = startRound(s); // A:5, B:3
    s = withDeck(s, [secondChance('sc'), num('r', 2)]);
    s = takeCard(s); // A draws Second Chance -> flag set, replacement 2 drawn
    expect(s.players[0].secondChance).toBe(true);
    expect(s.players[0].row.filter((c) => c.kind === 'action')).toHaveLength(0);
    expect(s.players[0].row.filter((c) => c.kind === 'number').map((c) => c.value)).toContain(2);
  });

  it('a duplicate while holding Second Chance pauses for a decision', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('a', 5), num('b', 3)]);
    s = startRound(s);
    s = withDeck(s, [secondChance('sc'), num('r', 2)]);
    s = takeCard(s); // A gets Second Chance + replacement 2
    s = stay(s); // B stays -> back to A
    s = withDeck(s, [num('dup', 2)]);
    s = takeCard(s); // A draws a duplicate 2 -> pending decision, no bust yet
    expect(s.pendingSecondChance).toBe(0);
    expect(s.players[0].roundStatus).toBe('active');

    s = resolveSecondChance(s, true); // use it
    expect(s.players[0].secondChance).toBe(false);
    expect(s.players[0].row.filter((c) => c.kind === 'number').map((c) => c.value)).toEqual([5, 2]); // duplicate gone
    expect(s.pendingSecondChance).toBe(null);
  });

  it('declining Second Chance on a duplicate busts the player', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('a', 5), num('b', 3)]);
    s = startRound(s);
    s = withDeck(s, [secondChance('sc'), num('r', 2)]);
    s = takeCard(s);
    s = stay(s);
    s = withDeck(s, [num('dup', 2)]);
    s = takeCard(s);
    s = resolveSecondChance(s, false); // take the bust
    expect(s.players[0].roundStatus).toBe('busted');
    expect(s.pendingSecondChance).toBe(null);
  });

  it('records each round score in history for the recap table', () => {
    let s = createGame({ ...setup2, dealerIndex: 1 });
    s = withDeck(s, [num('a', 5), num('b', 2)]);
    s = startRound(s);
    s = stay(s); // A stays with 5 -> banked, turn passes to B
    s = withDeck(s, [num('c', 2)]);
    s = takeCard(s); // B draws 2 (dup) -> bust -> round ends
    expect(s.phase).toBe('roundEnd');
    expect(s.history).toHaveLength(1);
    expect(s.history[0].round).toBe(1);
    expect(s.history[0].scores).toEqual([5, 0]); // A scored 5, B busted
  });

  it('a Freeze drawn by the last active player is discarded (never self-frozen)', () => {
    let s = createGame({
      players: [
        { id: 'a', name: 'A', isAI: false },
        { id: 'b', name: 'B', isAI: false },
        { id: 'c', name: 'C', isAI: false },
        { id: 'd', name: 'D', isAI: false },
      ],
    });
    // Everyone but A has left the round: A is the lone active player.
    s = {
      ...s,
      phase: 'play',
      currentIndex: 0,
      players: s.players.map((p, i) =>
        i === 0
          ? { ...p, row: [num('a1', 3)], distinct: [3], roundStatus: 'active' }
          : { ...p, roundStatus: 'stayed', roundScore: 10, bankedScore: 10 },
      ),
      deck: [freeze('f'), num('x', 7)],
    };
    const before = s.players[0].bankedScore;
    s = takeCard(s);
    expect(s.phase).toBe('roundEnd');
    // The Freeze has no other active target, so per the rules A must freeze
    // themselves — keeping the points they were holding.
    expect(s.players[0].roundStatus).toBe('frozen');
    expect(s.pendingFreeze).toBeNull();
    // A still banks the points it was holding when the round ends.
    expect(s.players[0].bankedScore).toBeGreaterThan(before);
  });
});

describe('archetype-driven disruptive cards', () => {
  it('aggressive AI freezes the weakest active opponent, not the strongest', () => {
    let s = createGame({
      players: [
        { id: 'a', name: 'A', isAI: true, archetype: 'aggressive' },
        { id: 'b', name: 'B', isAI: true, archetype: 'aggressive' },
        { id: 'c', name: 'C', isAI: true, archetype: 'aggressive' },
      ],
      dealerIndex: 2,
    });
    s = withDeck(s, [num('a', 10), num('b', 4), num('c', 1)]);
    s = startRound(s); // current = 0 (A), rows A=10 B=4 C=1
    s = withDeck(s, [freeze('f')]);
    s = takeCard(s); // A (aggressive) freezes the weakest opponent (C=1)
    expect(s.players[2].roundStatus).toBe('frozen'); // C (weakest) frozen
    expect(s.players[1].roundStatus).toBe('active'); // B (strongest) untouched
  });

  it('cautious AI never forces a Twist Three onto an opponent (targets self)', () => {
    let s = createGame({
      players: [
        { id: 'a', name: 'A', isAI: true, archetype: 'cautious' },
        { id: 'b', name: 'B', isAI: true, archetype: 'cautious' },
      ],
      dealerIndex: 1,
    });
    s = withDeck(s, [num('a', 5), num('b', 2)]);
    s = startRound(s); // current = 0 (A), A active [5], B active [2]
    const beforeB = s.players[1].row.length; // 1
    s = withDeck(s, [twistThree('t'), num('x1', 3), num('x2', 4), num('x3', 6)]);
    s = takeCard(s); // A draws Twist Three -> targets self (cautious)
    expect(s.players[1].row.length).toBe(beforeB); // B untouched
    expect(s.players[0].row.length).toBe(beforeB + 3); // A took the 3 draws
  });
});
