// ---------------------------------------------------------------------------
// Twist7 — core state machine types (pure TypeScript, no React imports)
// ---------------------------------------------------------------------------

export type Difficulty = 'easy' | 'medium' | 'hard';

export type CardValue = number; // 0..12

export interface NumberCard {
  id: string;
  kind: 'number';
  value: number; // 0..12
}
export interface ModifierCard {
  id: string;
  kind: 'modifier';
  modifier: 'plus' | 'double';
  amount: number; // for 'plus' the bonus; for 'double' = 2
}
export interface ActionCard {
  id: string;
  kind: 'action';
  action: 'freeze' | 'twistThree' | 'secondChance';
}
export type Card = NumberCard | ModifierCard | ActionCard;

export type PlayerId = string;

export type RoundStatus = 'active' | 'stayed' | 'busted' | 'frozen';

export interface Player {
  readonly id: PlayerId;
  name: string;
  isAI: boolean;
  difficulty: Difficulty;
  archetype?: 'aggressive' | 'tactical' | 'cautious';
  bankedScore: number;
  // per-round state
  row: Card[];
  distinct: number[]; // distinct number values currently held (sorted)
  roundScore: number;
  roundStatus: RoundStatus;
  secondChance: boolean;
  twistThree: boolean;
  twistSeven: boolean;
}

export type GamePhase = 'setup' | 'play' | 'roundEnd' | 'gameOver';

export interface Twist7Setup {
  players: { id: string; name: string; isAI: boolean; difficulty?: Difficulty; archetype?: 'aggressive' | 'tactical' | 'cautious' }[];
  dealerIndex?: number;
}

export interface Twist7State {
  players: Player[];
  deck: Card[];
  discard: Card[];
  dealerIndex: number;
  currentIndex: number;
  phase: GamePhase;
  roundNumber: number;
  targetScore: number;
  winnerId: PlayerId | null;
  // When set, the player at this index just drew a Freeze and must choose
  // another active player to hand it to. (Always a human — AI picks instantly.)
  pendingFreeze: number | null;
  // When set, the player at this index just drew a duplicate while holding a
  // Second Chance and must choose to use it or take the bust.
  pendingSecondChance: number | null;
  // Per-round score history, indexed by player order. Used for the recap table.
  history: { round: number; scores: number[] }[];
}
