'use client';

import { useEffect } from 'react';
import type { PauseCoordinator } from '@/game/pause/PauseCoordinator';

export function usePageLifecyclePause(coordinator: PauseCoordinator | null): void {
  useEffect(() => {
    if (!coordinator) {
      return;
    }

    const pauseForVisibility = () => {
      if (document.visibilityState === 'hidden') {
        coordinator.requestPause('visibility');
      }
    };
    const pauseForBlur = () => coordinator.requestPause('blur');
    const pauseForEscape = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        coordinator.requestPause('escape');
      }
    };
    const protectBrowserBack = () => {
      coordinator.requestPause('browser-back');
      window.history.pushState({ officeRhythmGame: true }, '', window.location.href);
    };

    window.history.pushState({ officeRhythmGame: true }, '', window.location.href);
    document.addEventListener('visibilitychange', pauseForVisibility);
    window.addEventListener('blur', pauseForBlur);
    window.addEventListener('keydown', pauseForEscape);
    window.addEventListener('popstate', protectBrowserBack);

    return () => {
      document.removeEventListener('visibilitychange', pauseForVisibility);
      window.removeEventListener('blur', pauseForBlur);
      window.removeEventListener('keydown', pauseForEscape);
      window.removeEventListener('popstate', protectBrowserBack);
    };
  }, [coordinator]);
}
