import { describe, expect, it } from 'vitest';
import { initialTutorialState, tutorialReducer } from './tutorialReducer';

describe('tutorialReducer', () => {
  it('advances through the tutorial and supports skip', () => {
    const next = tutorialReducer(initialTutorialState, { type: 'next', totalSteps: 2 });
    expect(next.stepIndex).toBe(1);
    expect(tutorialReducer(next, { type: 'next', totalSteps: 2 }).completed).toBe(true);
    expect(tutorialReducer(initialTutorialState, { type: 'skip' })).toMatchObject({ completed: true, skipped: true });
  });
});
