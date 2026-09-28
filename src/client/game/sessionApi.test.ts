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

  it('abandons only the matching active run and retries one ETag conflict with the fresh version', async () => {
    const requests: Array<{ path: string; method: string; version?: string }> = [];
    let getCount = 0;
    let abandonCount = 0;
    const fetcher: FetchLike = vi.fn(async (input, init) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      requests.push({ path, method, version: new Headers(init?.headers).get('If-Match') ?? undefined });
      if (method === 'GET') {
        getCount += 1;
        return jsonResponse({ session: { id: 'run-current' }, version: getCount === 1 ? 'v1' : 'v2' });
      }
      abandonCount += 1;
      return abandonCount === 1
        ? jsonResponse({ error: 'Stale ETag', code: 'SESSION_SERVICE_ERROR' }, 412)
        : jsonResponse({ session: { id: 'run-current' }, version: 'v3' });
    });
    const api = new SessionApiClient(async () => 'token', fetcher);

    await api.closeActiveRun('run-current');

    expect(requests.filter((request) => request.method === 'POST').map((request) => request.version)).toEqual(['v1', 'v2']);
    expect(abandonCount).toBe(2);
    expect(getCount).toBe(2);
  });

  it('does not abandon a different active run', async () => {
    const fetcher: FetchLike = vi.fn(async () => jsonResponse({ session: { id: 'other-run' }, version: 'v1' }));
    const api = new SessionApiClient(async () => 'token', fetcher);

    await expect(api.closeActiveRun('shown-run')).rejects.toThrow('A different game session is active.');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('bounds ETag recovery to one retry and reports a still-active conflict', async () => {
    let abandonCount = 0;
    let getCount = 0;
    const fetcher: FetchLike = vi.fn(async (_input, init) => {
      if ((init?.method ?? 'GET') === 'GET') {
        getCount += 1;
        return jsonResponse({ session: { id: 'same-run' }, version: `v${getCount}` });
      }
      abandonCount += 1;
      return jsonResponse({ error: 'Stale ETag', code: 'SESSION_SERVICE_ERROR' }, 412);
    });
    const api = new SessionApiClient(async () => 'token', fetcher);

    await expect(api.closeActiveRun('same-run')).rejects.toMatchObject({ status: 412 });
    expect(abandonCount).toBe(2);
    expect(getCount).toBe(3);
  });

  it('does not retry non-412 abandon failures', async () => {
    let abandonCount = 0;
    const fetcher: FetchLike = vi.fn(async (_input, init) => {
      if ((init?.method ?? 'GET') === 'GET') return jsonResponse({ session: { id: 'same-run' }, version: 'v1' });
      abandonCount += 1;
      return jsonResponse({ error: 'Unavailable', code: 'SESSION_SERVICE_ERROR' }, 503);
    });
    const api = new SessionApiClient(async () => 'token', fetcher);

    await expect(api.closeActiveRun('same-run')).rejects.toMatchObject({ status: 503 });
    expect(abandonCount).toBe(1);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
