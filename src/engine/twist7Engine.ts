import {
  Card,
  Twist7Setup,
  Twist7State,
  Player,
} from './types';
import { buildDeck, shuffle } from './deck';

// ===========================================================================
// Helpers
// ===========================================================================
function isNumber(c: Card): c is Extract<Card, { kind: 'number' }> {
  return c.kind === 'number';
}

function logCard(c: Card): string {
  if (c.kind === 'number') return `N${c.value}`;
  if (c.kind === 'modifier') return c.modifier === 'double' ? 'x2' : `+${c.amount}`;
  return c.action;
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
    players: state.players.map((p, i) =>
      i === idx ? { ...p, distinct: new Set(p.distinct).add(value) } : p,
    ),
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
    difficulty: p.difficulty ?? 'medium',
    bankedScore: 0,
    row: [],
    distinct: new Set<number>(),
    roundScore: 0,
    roundStatus: 'active',
    secondChance: false,
    flipThree: false,
    twistSeven: false,
  }));

  return {
    players,
    deck: buildDeck(),
    discard: [],
    dealerIndex: 0,
    currentIndex: 0,
    phase: 'setup',
    roundNumber: 1,
    targetScore,
    winnerId: null,
    log: ['Game created.'],
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
      distinct: new Set<number>(),
      roundScore: 0,
      roundStatus: 'active',
      secondChance: false,
      flipThree: false,
      twistSeven: false,
    })),
    log: [...state.log, `Round ${state.roundNumber} — dealer: ${state.players[state.dealerIndex].name}`],
  };

  // Deal ONE face-up card to each player, resolving action cards immediately.
  for (let i = 0; i < s.players.length; i++) {
    const { state: drawn, card } = drawTop(s);
    s = drawn;
    if (card) s = applyDrawnCard(s, i, card, true);
    if (s.phase !== 'setup') break; // a Twist 7 etc. ended the round mid-deal
  }

  // The dealer leads the round, but a freeze (or other effect) resolved during
  // the deal may have left them unable to act. Make sure the round never opens
  // on a non-active current player — otherwise the turn can never advance.
  const opened: Twist7State = {
    ...s,
    phase: 'play',
    currentIndex: s.dealerIndex,
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
  const idx = state.currentIndex;
  const p = state.players[idx];
  if (!p || p.roundStatus !== 'active') return state;

  const { state: drawn, card } = drawTop(state);
  if (!card) return endRound(drawn); // deck + discard exhausted

  // Holding a Second Chance and drew a duplicate: let the player decide.
  if (card.kind === 'number' && p.secondChance && p.distinct.has(card.value)) {
    const s = addCardToRow(drawn, idx, card); // provisional, removed if used
    return { ...s, pendingSecondChance: idx };
  }

  // Freeze: the drawer hands the card to another active player, who is frozen
  // out of the round but KEEPS the points they already hold. An AI picks a
  // target instantly; a human is prompted to choose one via the UI.
  if (card.kind === 'action' && card.action === 'freeze') {
    const target = autoFreezeTarget(drawn, idx);
    if (target == null) {
      // The drawer is the only active player left: there is no one else to
      // freeze. A Freeze must be handed to another player, so with no valid
      // target it is discarded. That ends the drawer's turn, and with nobody
      // else left to act the round is over — the drawer banks their points.
      let s = drawn;
      if (s.phase === 'play') s = endRound(s);
      return s;
    }
    if (p.isAI) {
      let s = giveFreeze(drawn, idx, target);
      if (s.phase === 'play') s = advanceTurn(s);
      return s;
    }
    return { ...drawn, pendingFreeze: idx }; // wait for the human's choice
  }

  let s = applyDrawnCard(drawn, idx, card, false);
  // After the card resolves, pass the turn. advanceTurn() skips busted/frozen
  // players and ends the round when nobody is left to act.
  if (s.phase === 'play') s = advanceTurn(s);
  console.log(
    `🔷 [Twist7] takeCard: ${p.name} drew ${logCard(card)} -> phase=${s.phase}, currentIndex=${s.currentIndex}`,
  );
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
      log: [...state.log, `${p.name} uses Second Chance!`],
    };
    return advanceTurn(s);
  }

  const busted = setStatus({ ...state, pendingSecondChance: null }, idx, 'busted');
  return advanceTurn({ ...busted, log: [...busted.log, `${busted.players[idx].name} BUSTS!`] });
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
    log: [...state.log, `${p.name} stays with ${scored}.`],
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
      distinct: new Set<number>(),
      roundScore: 0,
      roundStatus: 'active',
      secondChance: false,
      flipThree: false,
      twistSeven: false,
    })),
    log: [...state.log, 'Next round.'], // deck persists; only rows are discarded
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
  _isDeal: boolean,
): Twist7State {
  console.log(
    `🔷 [Twist7] applyDrawnCard: ${state.players[idx].name} <- ${logCard(card)} (distinct=${state.players[idx].distinct.size})`,
  );
  // Action cards are played immediately or set aside — they never sit in the row.
  if (card.kind === 'action') return resolveAction(state, idx, card.action);

  let s = addCardToRow(state, idx, card); // number or modifier

  if (isNumber(card)) {
    const p = s.players[idx];
    if (p.distinct.has(card.value)) {
      if (p.secondChance) return useSecondChance(s, idx); // save the turn (recursive contexts)
      return bustPlayer(s, idx);
    }
    s = addDistinct(s, idx, card.value);
    if (s.players[idx].distinct.size >= 7) return twistSeven(s, idx);
    return s;
  }

  // modifier: already placed above the numbers; no further effect
  return s;
}

function useSecondChance(state: Twist7State, idx: number): Twist7State {
  const p = state.players[idx];
  const row = p.row.slice(0, -1); // discard the duplicate just added
  return {
    ...state,
    players: state.players.map((q, i) =>
      i === idx ? { ...q, row, secondChance: false } : q,
    ),
    log: [...state.log, `${p.name} uses Second Chance!`],
  };
}

function bustPlayer(state: Twist7State, idx: number): Twist7State {
  const s = setStatus(state, idx, 'busted');
  return { ...s, log: [...s.log, `${s.players[idx].name} BUSTS!`] };
}

function twistSeven(state: Twist7State, idx: number): Twist7State {
  const s: Twist7State = {
    ...state,
    players: state.players.map((p, i) =>
      i === idx ? { ...p, twistSeven: true, roundStatus: 'stayed' } : p,
    ),
    log: [...state.log, `${state.players[idx].name} TWIST 7! +15`],
  };
  console.log(
    `🔷 [Twist7] TWIST 7! ${state.players[idx].name} reached 7 distinct numbers -> round ends immediately`,
  );
  return endRound(s);
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
    if (target == null) return state;
    return giveFreeze(state, idx, target);
  }

  if (action === 'secondChance') {
    const p = state.players[idx];
    if (p.secondChance) {
      // Already holding a Second Chance: pass it to another active player.
      const otherIdx = state.players.findIndex(
        (q, i) => i !== idx && q.roundStatus === 'active',
      );
      if (otherIdx >= 0) {
        return {
          ...state,
          players: state.players.map((q, i) =>
            i === otherIdx ? { ...q, secondChance: true } : q,
          ),
          log: [...state.log, `Second Chance passed to ${state.players[otherIdx].name}.`],
        };
      }
      return { ...state, log: [...state.log, 'Second Chance discarded (no one else).'] };
    }
    // First Second Chance: set it aside and immediately draw a replacement card.
    let s: Twist7State = {
      ...state,
      players: state.players.map((q, i) => (i === idx ? { ...q, secondChance: true } : q)),
      log: [...state.log, `${p.name} gets Second Chance.`],
    };
    const { state: drawn, card } = drawTop(s);
    s = drawn;
    if (card) s = applyDrawnCard(s, idx, card, false);
    return s;
  }

  // flipThree: force 3 draws (nested effects resolved automatically)
  let s: Twist7State = {
    ...state,
    players: state.players.map((q, i) => (i === idx ? { ...q, flipThree: true } : q)),
  };
  for (let k = 0; k < 3; k++) {
    if (s.players[idx].roundStatus !== 'active') break;
    if (s.phase === 'roundEnd' || s.phase === 'gameOver') break;
    const { state: drawn, card } = drawTop(s);
    s = drawn;
    if (!card) break;
    s = applyDrawnCard(s, idx, card, false);
  }
  return s;
}

/** Hand the Freeze card from the drawer to a target, freezing them out. */
function giveFreeze(state: Twist7State, drawerIdx: number, targetIdx: number): Twist7State {
  const s = setStatus({ ...state, pendingFreeze: null }, targetIdx, 'frozen');
  return {
    ...s,
    log: [...s.log, `${s.players[targetIdx].name} est gelé par ${state.players[drawerIdx].name} (gardé ses points).`],
  };
}

/**
 * Pick the best Freeze target for a drawer: the active opponent holding the
 * most points (the biggest threat). Returns null if the drawer is the only
 * active player (no one to freeze, so the card is discarded).
 */
function autoFreezeTarget(state: Twist7State, drawerIdx: number): number | null {
  let best = -1;
  let bestScore = -1;
  state.players.forEach((p, i) => {
    if (i === drawerIdx || p.roundStatus !== 'active') return;
    const sc = scoreRow(p);
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  });
  return best >= 0 ? best : null;
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
  if (targetIdx === idx || state.players[targetIdx]?.roundStatus !== 'active') return state;
  let s = giveFreeze(state, idx, targetIdx);
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
      console.log(`🔷 [Twist7] advanceTurn: only ${cur.name} still active, continues solo`);
      return state;
    }
    console.log('🔷 [Twist7] advanceTurn: no active players left -> endRound');
    return endRound(state);
  }
  for (let step = 1; step <= n; step++) {
    const idx = (state.currentIndex + step) % n;
    if (state.players[idx].roundStatus === 'active') {
      console.log(
        `🔷 [Twist7] advanceTurn: ${state.currentIndex} -> ${idx} (${state.players[idx].name})`,
      );
      return { ...state, currentIndex: idx };
    }
  }
  console.log('🔷 [Twist7] advanceTurn: nobody active left -> endRound');
  return endRound(state); // nobody active left → round over
}

function endRound(state: Twist7State): Twist7State {
  // Idempotent: only score/record when actively ending a live round.
  if (state.phase !== 'play') return state;

  const scored = state.players.map((p) =>
    p.roundStatus !== 'busted'
      ? { ...p, roundScore: scoreRow(p), bankedScore: p.bankedScore + scoreRow(p) }
      : p,
  );
  console.log(
    '🔷 [Twist7] endRound scores:',
    scored.map((p) => `${p.name}=${p.roundScore} (${p.roundStatus})`),
  );

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
      log: [...state.log, `Game over — ${winner.name} wins with ${winner.bankedScore}!`],
    };
  }
  return { ...state, players: scored, history, phase: 'roundEnd', log: [...state.log, 'Round over.'] };
}

// ===========================================================================
// Selectors (used by AI / UI)
// ===========================================================================
export function activePlayer(state: Twist7State): Player | null {
  return state.players[state.currentIndex] ?? null;
}

export function remainingNumberCopies(state: Twist7State, value: number): number {
  return state.deck.filter((c) => isNumber(c) && c.value === value).length;
}
