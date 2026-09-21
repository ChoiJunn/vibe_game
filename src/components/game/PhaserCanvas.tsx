'use client';

import { useEffect, useRef, useState } from 'react';
import beatmapJson from '@/content/beatmaps/office-day-01.json';
import { PauseOverlay } from './PauseOverlay';
import { ResultSummary } from '@/components/results/ResultSummary';
import { validateBeatmap } from '@/domain/validateBeatmap';
import { AudioClock } from '@/game/audio/AudioClock';
import { RhythmGameController, type RhythmGameSnapshot } from '@/game/RhythmGameController';
import { SpaceInputController } from '@/game/input/SpaceInputController';
import { PauseCoordinator, type PauseState } from '@/game/pause/PauseCoordinator';
import { usePageLifecyclePause } from '@/hooks/usePageLifecyclePause';

type GameRuntime = {
  controller: RhythmGameController;
  coordinator: PauseCoordinator;
  snapshot: RhythmGameSnapshot;
  pauseState: PauseState;
};

export function PhaserCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [runtime, setRuntime] = useState<GameRuntime | null>(null);
  const [coordinator, setCoordinator] = useState<PauseCoordinator | null>(null);

  usePageLifecyclePause(coordinator);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const beatmap = validateBeatmap(beatmapJson);
    const controller = new RhythmGameController({ beatmap, clock: new AudioClock() });
    const inputController = new SpaceInputController({
      inputTarget: mount,
      blurTarget: window,
      isViewportFocused: () => document.activeElement === mount,
      getGameState: () => controller.getSnapshot().clockState,
      getSongPositionMs: () => controller.getSongPositionMs(),
      onInput: (input) => controller.handleInput(input),
      onPauseRequest: () => controller.pause(),
    });
    controller.attachInputController(inputController);
    const pauseCoordinator = new PauseCoordinator(controller);
    setCoordinator(pauseCoordinator);
    setRuntime({
      controller,
      coordinator: pauseCoordinator,
      snapshot: controller.getSnapshot(),
      pauseState: pauseCoordinator.getState(),
    });
    const unsubscribeController = controller.subscribe((snapshot) => {
      setRuntime((current) => current ? { ...current, snapshot } : current);
    });
    const unsubscribePause = pauseCoordinator.subscribe((pauseState) => {
      setRuntime((current) => current ? { ...current, pauseState } : current);
    });

    let game: import('phaser').Game | null = null;
    let started = false;
    let disposed = false;

    const startGame = () => {
      mount.focus();
      if (started) {
        return;
      }

      started = true;
      void controller.start().catch(() => {
        started = false;
      });
    };

    mount.addEventListener('pointerdown', startGame);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => game?.scale.resize(mount.clientWidth, mount.clientHeight))
      : null;
    resizeObserver?.observe(mount);

    void import('@/game/PhaserGame').then(({ createPhaserGame }) => {
      if (!disposed) {
        game = createPhaserGame(mount, controller);
      }
    });

    return () => {
      disposed = true;
      mount.removeEventListener('pointerdown', startGame);
      resizeObserver?.disconnect();
      controller.dispose();
      unsubscribeController();
      unsubscribePause();
      setCoordinator(null);
      setRuntime(null);
      game?.destroy(true);
    };
  }, []);

  const showResult = runtime?.snapshot.runState.status === 'completed'
    || runtime?.snapshot.runState.status === 'failed'
    || runtime?.snapshot.runState.status === 'abandoned';

  return (
    <>
      <div ref={mountRef} className="phaser-canvas-shell" tabIndex={0} aria-label="Office Rhythm Manager Phaser 게임 캔버스" />
      {runtime && !runtime.pauseState.paused && runtime.snapshot.clockState === 'playing' && !showResult && (
        <button type="button" className="pause-button" onClick={() => runtime.coordinator.requestPause('button')}>
          일시정지
        </button>
      )}
      {runtime && (
        <PauseOverlay
          paused={runtime.pauseState.paused}
          reason={runtime.pauseState.reason}
          snapshot={runtime.pauseState.snapshot}
          onResume={() => void runtime.coordinator.resume()}
          onAbandon={() => runtime.coordinator.abandon()}
        />
      )}
      {runtime && showResult && (
        <ResultSummary runState={runtime.snapshot.runState} elapsedMs={runtime.snapshot.songPositionMs} onPlayAgain={() => void runtime.controller.start()} />
      )}
    </>
  );
}
