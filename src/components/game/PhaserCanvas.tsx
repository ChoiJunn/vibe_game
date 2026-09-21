'use client';

import { useEffect, useRef } from 'react';
import beatmapJson from '@/content/beatmaps/office-day-01.json';
import { validateBeatmap } from '@/domain/validateBeatmap';
import { AudioClock } from '@/game/audio/AudioClock';
import { RhythmGameController } from '@/game/RhythmGameController';
import { SpaceInputController } from '@/game/input/SpaceInputController';

export function PhaserCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

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
      game?.destroy(true);
    };
  }, []);

  return <div ref={mountRef} className="phaser-canvas-shell" tabIndex={0} aria-label="Office Rhythm Manager Phaser 게임 캔버스" />;
}
