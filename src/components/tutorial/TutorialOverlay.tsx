'use client';

import { useEffect, useReducer, useState } from 'react';
import { getTutorialStep, initialTutorialState, tutorialReducer } from '@/game/tutorial/tutorialReducer';
import { tutorialSteps } from '@/game/tutorial/tutorialSteps';

const STORAGE_KEY = 'office-rhythm-manager:tutorial-disabled';

export function TutorialOverlay({ onStart }: { onStart: () => void }) {
  const [state, dispatch] = useReducer(tutorialReducer, initialTutorialState);
  const [visible, setVisible] = useState(false);
  const [tutorialDisabled, setTutorialDisabled] = useState(false);
  const step = getTutorialStep(state, tutorialSteps);

  useEffect(() => {
    queueMicrotask(() => {
      let disabled = false;
      try {
        disabled = window.localStorage.getItem(STORAGE_KEY) === 'true';
      } catch {
        // Keep the tutorial available when browser storage is blocked.
      }
      setTutorialDisabled(disabled);
      setVisible(!disabled);
    });
  }, []);

  useEffect(() => {
    if (!visible || state.completed || state.stepIndex === tutorialSteps.length - 1) {
      return;
    }

    const timer = window.setTimeout(() => dispatch({ type: 'next', totalSteps: tutorialSteps.length }), step.durationMs);
    return () => window.clearTimeout(timer);
  }, [state.completed, state.stepIndex, step.durationMs, visible]);

  if (tutorialDisabled || !visible || state.completed) {
    return null;
  }

  const start = () => {
    setVisible(false);
    onStart();
  };

  const disableAndStart = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Start the current run even if the preference cannot be saved.
    }
    setTutorialDisabled(true);
    start();
  };

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-card">
        <p className="eyebrow">QUICK TUTORIAL {state.stepIndex + 1}/{tutorialSteps.length}</p>
        <h2 id="tutorial-title">{step.title}</h2>
        <p>{step.body}</p>
        <p className="tutorial-hint">{step.hint}</p>
        <div className="tutorial-actions">
          <button type="button" onClick={start}>건너뛰기</button>
          {state.stepIndex > 0 && <button type="button" onClick={() => dispatch({ type: 'previous' })}>이전</button>}
          {state.stepIndex === tutorialSteps.length - 1 ? (
            <button type="button" className="primary" onClick={start}>게임 시작</button>
          ) : (
            <button type="button" className="primary" onClick={() => dispatch({ type: 'next', totalSteps: tutorialSteps.length })}>다음</button>
          )}
          <button type="button" onClick={disableAndStart}>다음부터 튜토리얼 하지 않기</button>
        </div>
      </div>
    </div>
  );
}
