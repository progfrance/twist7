import {
  Card,
  Twist7Setup,
  Twist7State,
  Player,
} from './types';
import { buildDeck, shuffle } from './deck';
import { PROFILE_BEHAVIOR } from '../ai/behavior';

// Laying this many distinct numbers triggers a Twist 7 (+15 bonus).
export const TWIST7_DISTINCT_COUNT = 7;

// ===========================================================================
// Helpers
// ===========================================================================
function isNumber(c: Card): c is Extract<Card, { kind: 'number' }> {
  return c.kind === 'number';
}

function drawTop(state: Twist7State): { state: Twist7State; card: Card | null } {
  let deck = state.deck;
  let discard = state.discard;
  if (deck.length === 0) {
    if (discard.length === 0) return { state, card: null };
    deck = shuffle(discard); // reshuffle discard into a fresh draw pile
    discard = [];
  }
  const d = deck.slice();
  const card = d.shift()!;
  return { state: { ...state, deck: d, discard }, card };
}

function addCardToRow(state: Twist7State, idx: number, card: Card): Twist7State {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === idx ? { ...p, row: [...p.row, card] } : p,
    ),
  };
}

function addDistinct(state: Twist7State, idx: number, value: number): Twist7State {
  return {
    ...state,
    players: state.players.map((p, i) => {
      if (i !== idx) return p;
      const arr = p.distinct.slice();
      // insert value in sorted order without full sort
      let inserted = false;
      for (let j = 0; j < arr.length; j++) {
        if (value < arr[j]) {
          arr.splice(j, 0, value);
          inserted = true;
          break;
        }
      }
      if (!inserted) arr.push(value);
      return { ...p, distinct: arr };
    }),
  };
}

function setStatus(
  state: Twist7State,
  idx: number,
  status: Player['roundStatus'],
): Twist7State {
  return {
    ...state,
    players: state.players.map((p, i) => (i === idx ? { ...p, roundStatus: status } : p)),
  };
}

// ===========================================================================
// Scoring
// ===========================================================================
export function scoreRow(p: Player): number {
  if (p.roundStatus === 'busted') return 0;
  let numberSum = 0;
  let plusSum = 0;
  let hasDouble = false;
  for (const c of p.row) {
    if (c.kind === 'number') numberSum += c.value;
    else if (c.kind === 'modifier') {
      if (c.modifier === 'plus') plusSum += c.amount;
      else hasDouble = true;
    }
  }
  const total = (hasDouble ? numberSum * 2 : numberSum) + plusSum + (p.twistSeven ? 15 : 0);
  return total;
}

// ===========================================================================
// Setup
// ===========================================================================
export function createGame(setup: Twist7Setup, targetScore = 200): Twist7State {
  const players: Player[] = setup.players.map((p) => ({
    id: p.id,
    name: p.name,
    isAI: p.isAI,
    archetype: p.archetype,
    bankedScore: 0,
    row: [],
    distinct: [],
    roundScore: 0,
    roundStatus: 'active',
    secondChance: false,
    twistThree: false,
    twistSeven: false,
  }));

  return {
    players,
    deck: buildDeck(),
    discard: [],
    dealerIndex: setup.dealerIndex ?? 0,
    currentIndex: 0,
    phase: 'setup',
    roundNumber: 1,
    targetScore,
    winnerId: null,
    pendingFreeze: null,
    pendingSecondChance: null,
    history: [],
  };
}

// ===========================================================================
// Round flow
// ===========================================================================
export function startRound(state: Twist7State): Twist7State {
  if (state.phase !== 'setup') return state;

  let s: Twist7State = {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      row: [],
      distinct: [],
      roundScore: 0,
      roundStatus: 'active',
      secondChance: false,
      twistThree: false,
      twistSeven: false,
    })),
  };

  // Deal ONE face-up card to each player, resolving action cards immediately.
  for (let i = 0; i < s.players.length; i++) {
    const { state: drawn, card } = drawTop(s);
    s = drawn;
    if (card) s = applyDrawnCard(s, i, card);
    if (s.phase !== 'setup') break; // a Twist 7 etc. ended the round mid-deal
  }

  // Play starts with the player to the dealer's left (clockwise). A freeze (or
  // other effect) resolved during the deal may have left them unable to act, so
  // make sure the round never opens on a non-active current player.
  const opened: Twist7State = {
    ...s,
    phase: 'play',
    currentIndex: (s.dealerIndex + 1) % s.players.length,
    pendingFreeze: null,
    pendingSecondChance: null,
  };
  if (opened.players[opened.currentIndex].roundStatus !== 'active') {
    return advanceTurn(opened);
  }
  return opened;
}

/** Current player draws one card and resolves its effect. */
export function takeCard(state: Twist7State): Twist7State {
  if (state.phase !== 'play') return state;
  if (state.pendingSecondChance != null) return state; // must resolve first
  if (state.pendingFreeze != null) return state; // human must pick a Freeze target first
  const idx = state.currentIndex;
  const p = state.players[idx];
  if (!p || p.roundStatus !== 'active') return state;

  const { state: drawn, card } = drawTop(state);
  if (!card) return endRound(drawn); // deck + discard exhausted

  // Holding a Second Chance and drew a duplicate: let the player decide.
  if (card.kind === 'number' && p.secondChance && p.distinct.includes(card.value)) {
    const s = addCardToRow(drawn, idx, card); // provisional, removed if used
    return { ...s, pendingSecondChance: idx };
  }

  // Freeze: the drawer hands the card to another active player, who is frozen
  // out of the round but KEEPS the points they already hold. An AI picks a
  // target instantly; a human is prompted to choose one via the UI.
  if (card.kind === 'action' && card.action === 'freeze') {
    const target = autoFreezeTarget(drawn, idx);
    if (target == null) {
      // The drawer is the only active player left: per the rules they must
      // freeze themselves, keeping their points. That ends their turn; with
      // nobody else left to act the round ends and they bank their points.
      let s = giveFreeze(drawn, idx);
      if (s.phase === 'play') s = advanceTurn(s);
      return s;
    }
    if (p.isAI) {
      let s = giveFreeze(drawn, target);
      if (s.phase === 'play') s = advanceTurn(s);
      return s;
    }
    return { ...drawn, pendingFreeze: idx }; // wait for the human's choice
  }

  let s = applyDrawnCard(drawn, idx, card);
  // After the card resolves, pass the turn. advanceTurn() skips busted/frozen
  // players and ends the round when nobody is left to act.
  if (s.phase === 'play') s = advanceTurn(s);
  return s;
}

/**
 * Resolve a pending Second Chance decision. useIt discards the duplicate just
 * drawn (and the Second Chance card) and the player survives; otherwise the
 * player busts. The turn then passes as usual.
 */
export function resolveSecondChance(state: Twist7State, useIt: boolean): Twist7State {
  const idx = state.pendingSecondChance;
  if (idx == null) return state;

  if (useIt) {
    const p = state.players[idx];
    const row = p.row.slice(0, -1); // discard the provisional duplicate
    const s: Twist7State = {
      ...state,
      pendingSecondChance: null,
      players: state.players.map((q, i) =>
        i === idx ? { ...q, row, secondChance: false } : q,
      ),
    };
    return advanceTurn(s);
  }

  const busted = setStatus({ ...state, pendingSecondChance: null }, idx, 'busted');
  return advanceTurn(busted);
}

/** Current player banks their row and leaves the round. */
export function stay(state: Twist7State): Twist7State {
  if (state.phase !== 'play') return state;
  const idx = state.currentIndex;
  const p = state.players[idx];
  if (!p || p.roundStatus !== 'active') return state;

  const scored = scoreRow({ ...p, roundStatus: 'stayed' });
  const s: Twist7State = {
    ...state,
    players: state.players.map((q, i) =>
      i === idx ? { ...q, roundStatus: 'stayed', roundScore: scored } : q,
    ),
  };
  return advanceTurn(s);
}

export function nextRound(state: Twist7State): Twist7State {
  if (state.phase !== 'roundEnd') return state;
  const discardedRows = state.players.flatMap((p) => p.row);
  return {
    ...state,
    dealerIndex: (state.dealerIndex + 1) % state.players.length,
    roundNumber: state.roundNumber + 1,
    phase: 'setup',
    discard: [...state.discard, ...discardedRows],
    players: state.players.map((p) => ({
      ...p,
      row: [],
      distinct: [],
      roundScore: 0,
      roundStatus: 'active',
      secondChance: false,
      twistThree: false,
      twistSeven: false,
    })),
    pendingFreeze: null,
    pendingSecondChance: null,
  };
}

// ===========================================================================
// Internal resolution
// ===========================================================================
function applyDrawnCard(
  state: Twist7State,
  idx: number,
  card: Card,
): Twist7State {
  // Action cards are played immediately or set aside — they never sit in the row.
  if (card.kind === 'action') return resolveAction(state, idx, card.action);

  let s = addCardToRow(state, idx, card); // number or modifier

  if (isNumber(card)) {
    const p = s.players[idx];
    if (p.distinct.includes(card.value)) {
      if (p.secondChance) return consumeSecondChance(s, idx); // save the turn (recursive contexts)
      return bustPlayer(s, idx);
    }
    s = addDistinct(s, idx, card.value);
    if (s.players[idx].distinct.length >= TWIST7_DISTINCT_COUNT) return twistSeven(s, idx);
    return s;
  }

  // modifier: already placed above the numbers; no further effect
  return s;
}

function consumeSecondChance(state: Twist7State, idx: number): Twist7State {
  const p = state.players[idx];
  const row = p.row.slice(0, -1); // discard the duplicate just added
  return {
    ...state,
    players: state.players.map((q, i) =>
      i === idx ? { ...q, row, secondChance: false } : q,
    ),
  };
}

function bustPlayer(state: Twist7State, idx: number): Twist7State {
  return setStatus(state, idx, 'busted');
}

function twistSeven(state: Twist7State, idx: number): Twist7State {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === idx ? { ...p, twistSeven: true, roundStatus: 'stayed' } : p,
    ),
  };
}

function resolveAction(
  state: Twist7State,
  idx: number,
  action: Extract<Card, { kind: 'action' }>['action'],
): Twist7State {
  if (action === 'freeze') {
    // The freeze is given to another active player (auto-chosen here for the
    // deal and forced draws; a human's normal turn is handled in takeCard).
    // With no other active player there is no valid target, so the card is
    // discarded rather than freezing the drawer.
    const target = autoFreezeTarget(state, idx);
    // No other active player: per the rules the drawer must freeze themselves.
    if (target == null) return giveFreeze(state, idx);
    return giveFreeze(state, target);
  }

  if (action === 'secondChance') {
    const p = state.players[idx];
    if (p.secondChance) {
      // Already holding a Second Chance: pass it to another active player.
      const otherIdx = state.players.findIndex(
        (q, i) => i !== idx && q.roundStatus === 'active' && !q.secondChance,
      );
      if (otherIdx >= 0) {
        return {
          ...state,
          players: state.players.map((q, i) =>
            i === otherIdx ? { ...q, secondChance: true } : q,
          ),
        };
      }
      return state; // no one else to receive it — discarded
    }
    // First Second Chance: set it aside and immediately draw a replacement card.
    let s: Twist7State = {
      ...state,
      players: state.players.map((q, i) => (i === idx ? { ...q, secondChance: true } : q)),
    };
    const { state: drawn, card } = drawTop(s);
    s = drawn;
    if (card) s = applyDrawnCard(s, idx, card);
    return s;
  }

  // twistThree: force 3 draws on an opponent (or on yourself if you are the only
  // active player). The chosen player is flagged so the UI shows the effect,
  // matching the card copy "flipped by an opponent".
  const target = autoTwistThreeTarget(state, idx);
  let s: Twist7State = {
    ...state,
    players: state.players.map((q, i) => (i === target ? { ...q, twistThree: true } : q)),
  };
  for (let k = 0; k < 3; k++) {
    if (s.players[target].roundStatus !== 'active') break;
    if (s.phase === 'roundEnd' || s.phase === 'gameOver') break;
    const { state: drawn, card } = drawTop(s);
    s = drawn;
    if (!card) break;
    s = applyDrawnCard(s, target, card);
  }
  return s;
}

/** Hand the Freeze card from the drawer to a target, freezing them out. */
function giveFreeze(state: Twist7State, targetIdx: number): Twist7State {
  return setStatus({ ...state, pendingFreeze: null }, targetIdx, 'frozen');
}

/** Pick an active opponent (not the drawer) with the extreme score, per `kind`. */
function targetByScore(
  state: Twist7State,
  drawerIdx: number,
  kind: 'weakest' | 'strongest',
): number {
  let best = -1;
  let bestScore = kind === 'strongest' ? -Infinity : Infinity;
  state.players.forEach((p, i) => {
    if (i === drawerIdx || p.roundStatus !== 'active') return;
    const sc = scoreRow(p);
    if (kind === 'strongest' ? sc > bestScore : sc < bestScore) {
      bestScore = sc;
      best = i;
    }
  });
  return best;
}

/**
 * Freeze target for a drawer: honour the archetype's preferred victim
 * ('weakest' for aggressive, 'strongest' otherwise). Returns null when there is
 * no other active opponent (the caller then freezes the drawer themselves).
 */
function autoFreezeTarget(state: Twist7State, drawerIdx: number): number | null {
  const archetype = state.players[drawerIdx]?.archetype ?? 'tactical';
  const idx = targetByScore(state, drawerIdx, PROFILE_BEHAVIOR[archetype].freezeTarget);
  return idx >= 0 ? idx : null;
}

/**
 * Twist Three target for a drawer: honour the archetype. 'self' means the drawer
 * takes the three draws (cautious never forces opponents); otherwise the
 * weakest/strongest active opponent receives them, falling back to the drawer
 * when nobody else is active.
 */
function autoTwistThreeTarget(state: Twist7State, drawerIdx: number): number {
  const archetype = state.players[drawerIdx]?.archetype ?? 'tactical';
  const kind = PROFILE_BEHAVIOR[archetype].twistThreeTarget;
  if (kind === 'self') return drawerIdx;
  const idx = targetByScore(state, drawerIdx, kind);
  return idx >= 0 ? idx : drawerIdx;
}

/**
 * Resolve a human's pending Freeze: freeze the chosen active opponent and pass
 * the turn. `targetIdx` must be a different active player (the only-active case
 * is handled automatically in takeCard, so pendingFreeze only offers real
 * choices).
 */
export function resolveFreeze(state: Twist7State, targetIdx: number): Twist7State {
  const idx = state.pendingFreeze;
  if (idx == null) return state;
  if (targetIdx === idx) throw new Error('cannot freeze yourself');
  const target = state.players[targetIdx];
  if (!target || target.roundStatus !== 'active') {
    throw new Error('target is not active');
  }
  let s = giveFreeze(state, targetIdx);
  if (s.phase === 'play') s = advanceTurn(s);
  return s;
}

function advanceTurn(state: Twist7State): Twist7State {
  const n = state.players.length;
  const cur = state.players[state.currentIndex];
  const otherActive = state.players.some(
    (p, i) => i !== state.currentIndex && p.roundStatus === 'active',
  );
  if (!otherActive) {
    // Only the current player (or nobody) is still active: the lone player
    // keeps going solo, otherwise the round is over.
    if (cur.roundStatus === 'active') {
      return state;
    }
    return endRound(state);
  }
  for (let step = 1; step <= n; step++) {
    const idx = (state.currentIndex + step) % n;
    if (state.players[idx].roundStatus === 'active') {
      return { ...state, currentIndex: idx };
    }
  }
  return endRound(state); // nobody active left → round over
}

export function endRound(state: Twist7State): Twist7State {
  // Idempotent: only score/record when actively ending a live round.
  if (state.phase !== 'play') return state;

  const scored = state.players.map((p) => {
    if (p.roundStatus === 'busted') return p;
    const row = scoreRow(p);
    return { ...p, roundScore: row, bankedScore: p.bankedScore + row };
  });
  const history = [
    ...state.history,
    { round: state.roundNumber, scores: scored.map((p) => p.roundScore) },
  ];

  const winner = scored.reduce((a, b) => (b.bankedScore > a.bankedScore ? b : a));
  if (winner.bankedScore >= state.targetScore) {
    return {
      ...state,
      players: scored,
      history,
      phase: 'gameOver',
      winnerId: winner.id,
    };
  }
  return { ...state, players: scored, history, phase: 'roundEnd' };
}

// ===========================================================================
// Selectors (used by AI / UI)
// ===========================================================================
export function remainingNumberCopies(state: Twist7State, value: number): number {
  return state.deck.filter((c) => isNumber(c) && c.value === value).length;
}
