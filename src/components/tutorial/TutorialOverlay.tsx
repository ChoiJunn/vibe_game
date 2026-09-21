'use client';

import { useEffect, useReducer, useState } from 'react';
import { getTutorialStep, initialTutorialState, tutorialReducer } from '@/game/tutorial/tutorialReducer';
import { tutorialSteps } from '@/game/tutorial/tutorialSteps';

const STORAGE_KEY = 'office-rhythm-manager:tutorial-complete';

export function TutorialOverlay({ onComplete }: { onComplete?: () => void }) {
  const [state, dispatch] = useReducer(tutorialReducer, initialTutorialState);
  const [visible, setVisible] = useState(false);
  const step = getTutorialStep(state, tutorialSteps);

  useEffect(() => {
    setVisible(window.localStorage.getItem(STORAGE_KEY) !== 'true');
  }, []);

  useEffect(() => {
    if (!visible || state.completed) {
      return;
    }

    const timer = window.setTimeout(() => dispatch({ type: 'next', totalSteps: tutorialSteps.length }), step.durationMs);
    return () => window.clearTimeout(timer);
  }, [state.completed, state.stepIndex, step.durationMs, visible]);

  useEffect(() => {
    if (!state.completed) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    onComplete?.();
  }, [onComplete, state.completed]);

  if (!visible || state.completed) {
    return null;
  }

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-card">
        <p className="eyebrow">QUICK TUTORIAL {state.stepIndex + 1}/{tutorialSteps.length}</p>
        <h2 id="tutorial-title">{step.title}</h2>
        <p>{step.body}</p>
        <p className="tutorial-hint">{step.hint}</p>
        <div className="tutorial-actions">
          <button type="button" onClick={() => dispatch({ type: 'skip' })}>건너뛰기</button>
          {state.stepIndex > 0 && <button type="button" onClick={() => dispatch({ type: 'previous' })}>이전</button>}
          <button type="button" className="primary" onClick={() => dispatch({ type: 'next', totalSteps: tutorialSteps.length })}>
            {state.stepIndex === tutorialSteps.length - 1 ? '게임 시작' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
