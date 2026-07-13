import { useReducer, useCallback } from 'react';
import {
  createGame,
  startRound,
  takeCard,
  stay,
  nextRound,
  resolveSecondChance,
  resolveFreeze,
} from '../engine/twist7Engine';
import { Twist7Setup, Twist7State } from '../engine/types';

type Action =
  | { type: 'START_ROUND' }
  | { type: 'TAKE' }
  | { type: 'STAY' }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESOLVE_SECOND_CHANCE'; useIt: boolean }
  | { type: 'RESOLVE_FREEZE'; targetIdx: number };

function reducer(state: Twist7State, action: Action): Twist7State {
  switch (action.type) {
    case 'START_ROUND':
      return startRound(state);
    case 'TAKE':
      return takeCard(state);
    case 'STAY':
      return stay(state);
    case 'NEXT_ROUND':
      return nextRound(state);
    case 'RESOLVE_SECOND_CHANCE':
      return resolveSecondChance(state, action.useIt);
    case 'RESOLVE_FREEZE':
      return resolveFreeze(state, action.targetIdx);
  }
}

export function useTwist7Game(setup: Twist7Setup) {
  const [state, dispatch] = useReducer(reducer, setup, (s) => createGame(s));

  const take = useCallback(() => dispatch({ type: 'TAKE' }), []);
  const stay = useCallback(() => dispatch({ type: 'STAY' }), []);
  const startRound_ = useCallback(() => dispatch({ type: 'START_ROUND' }), []);
  const nextRound_ = useCallback(() => dispatch({ type: 'NEXT_ROUND' }), []);
  const resolveSecondChance_ = useCallback(
    (useIt: boolean) => dispatch({ type: 'RESOLVE_SECOND_CHANCE', useIt }),
    [],
  );
  const resolveFreeze_ = useCallback(
    (targetIdx: number) => dispatch({ type: 'RESOLVE_FREEZE', targetIdx }),
    [],
  );

  return {
    state,
    take,
    stay,
    startRound: startRound_,
    nextRound: nextRound_,
    resolveSecondChance: resolveSecondChance_,
    resolveFreeze: resolveFreeze_,
  };
}
