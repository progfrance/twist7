export type AiDecision = 'take' | 'stay';

export type Archetype = 'aggressive' | 'tactical' | 'cautious';

export interface AIProfile {
  maxBustRisk: (state: import('../engine/types').Twist7State, me: import('../engine/types').Player) => number;
  pickFreezeTarget: (state: import('../engine/types').Twist7State, drawerIdx: number) => number;
  pickTwistThreeTarget: (state: import('../engine/types').Twist7State, drawerIdx: number) => number;
  twistSevenUrgency: number;
  label: string;
}
