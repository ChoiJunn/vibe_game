import { describe, expect, it, vi } from 'vitest';
import { createInitialRunState } from '@/game/state/reduceRunState';
import { PauseCoordinator } from './PauseCoordinator';

describe('PauseCoordinator', () => {
  it('preserves a run snapshot across pause and resume, and supports abandon', async () => {
    let clockState: 'playing' | 'paused' = 'playing';
    const runState = createInitialRunState({ runId: 'run-01', userOid: 'user-01', beatmapId: 'office-day-01' });
    const controller = {
      pause: vi.fn(() => { clockState = 'paused'; }),
      resume: vi.fn(async () => { clockState = 'playing'; }),
      abandon: vi.fn(),
      getSnapshot: vi.fn(() => ({ clockState, runState, songPositionMs: 1200 })),
    };
    const coordinator = new PauseCoordinator(controller as never);

    expect(coordinator.requestPause('browser-back')).toBe(true);
    expect(coordinator.getState().snapshot?.runId).toBe('run-01');
    await coordinator.resume();
    expect(controller.resume).toHaveBeenCalledTimes(1);

    coordinator.requestPause('button');
    coordinator.abandon();
    expect(controller.abandon).toHaveBeenCalledTimes(1);
    expect(coordinator.getState().paused).toBe(false);
  });
});
