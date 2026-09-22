import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionApiClient, type FetchLike } from './sessionApi';

describe('SessionApiClient', () => {
  afterEach(() => vi.useRealTimers());

  it('turns a stalled request into a retryable timeout instead of waiting forever', async () => {
    vi.useFakeTimers();
    const fetcher: FetchLike = vi.fn((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const api = new SessionApiClient(async () => 'token', fetcher, 100);

    const request = api.getActive();
    const expectation = expect(request).rejects.toMatchObject({ status: 408, code: 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(100);

    await expectation;
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('times out while waiting for an identity token too', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn() as unknown as FetchLike;
    const api = new SessionApiClient(() => new Promise<string>(() => undefined), fetcher, 100);

    const request = api.getActive();
    const expectation = expect(request).rejects.toMatchObject({ status: 408, code: 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(100);

    await expectation;
    expect(fetcher).not.toHaveBeenCalled();
  });
});
