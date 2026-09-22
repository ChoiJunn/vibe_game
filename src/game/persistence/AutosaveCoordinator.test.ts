import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialRunState } from '@/game/state/reduceRunState';
import { SessionApiError, type SessionApiClient } from '@/client/game/sessionApi';
import { AutosaveCoordinator } from './AutosaveCoordinator';

const snapshot = createInitialRunState({ runId: 'run-1', userOid: 'user-1', beatmapId: 'office-day-01' });

function createHarness(save: ReturnType<typeof vi.fn>) {
  const api = {
    save,
    pause: vi.fn().mockResolvedValue({ version: 'v3' }),
    abandon: vi.fn().mockResolvedValue({ version: 'v4' }),
  } as unknown as SessionApiClient;
  const coordinator = new AutosaveCoordinator({
    api,
    runId: 'run-1',
    version: 'v1',
    readSnapshot: () => snapshot,
    options: { debounceMs: 100, intervalMs: 5000, sleep: async () => undefined },
  });
  return { api, coordinator };
}

describe('AutosaveCoordinator', () => {
  afterEach(() => vi.useRealTimers());

  it('debounces judgement saves and advances the ETag version', async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue({ version: 'v2' });
    const { coordinator } = createHarness(save);

    coordinator.onJudgement();
    coordinator.onJudgement();
    await vi.advanceTimersByTimeAsync(100);

    expect(save).toHaveBeenCalledTimes(1);
    expect(coordinator.getState().status).toBe('saved');
  });

  it('retries transient network errors with a non-blocking status', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ version: 'v2' });
    const { coordinator } = createHarness(save);

    await coordinator.saveNow();

    expect(save).toHaveBeenCalledTimes(2);
    expect(coordinator.getState().status).toBe('saved');
  });

  it('surfaces ETag conflicts and does not silently overwrite', async () => {
    const save = vi.fn().mockRejectedValue(new SessionApiError('stale', 412, 'SESSION_VERSION_CONFLICT'));
    const { coordinator } = createHarness(save);

    await coordinator.saveNow();

    expect(save).toHaveBeenCalledTimes(1);
    expect(coordinator.getState().status).toBe('conflict');
  });

  it('requires an explicit confirmation before abandoning', async () => {
    const { api, coordinator } = createHarness(vi.fn().mockResolvedValue({ version: 'v2' }));

    await expect(coordinator.abandon(false)).rejects.toThrow(/confirmation/);
    expect(api.abandon).not.toHaveBeenCalled();
    await coordinator.abandon(true);
    expect(api.abandon).toHaveBeenCalledWith('run-1', 'v2', true);
  });
});
