import type { TutorialStep } from './tutorialSteps';

export type TutorialState = {
  stepIndex: number;
  completed: boolean;
  skipped: boolean;
};

export type TutorialAction =
  | { type: 'next'; totalSteps: number }
  | { type: 'previous' }
  | { type: 'skip' }
  | { type: 'reset' };

export const initialTutorialState: TutorialState = {
  stepIndex: 0,
  completed: false,
  skipped: false,
};

export function tutorialReducer(state: TutorialState, action: TutorialAction): TutorialState {
  switch (action.type) {
    case 'next':
      return state.stepIndex >= action.totalSteps - 1
        ? { ...state, completed: true }
        : { ...state, stepIndex: state.stepIndex + 1 };
    case 'previous':
      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) };
    case 'skip':
      return { ...state, completed: true, skipped: true };
    case 'reset':
      return initialTutorialState;
  }
}

export function getTutorialStep(state: TutorialState, steps: readonly TutorialStep[]): TutorialStep {
  return steps[state.stepIndex] ?? steps[steps.length - 1];
}
