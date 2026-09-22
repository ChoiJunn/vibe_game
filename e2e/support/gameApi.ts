import type { Page, Route } from '@playwright/test';
import type { GameResultDocument, GameSessionDocument } from '../../src/server/cosmos/models';
import type { RunState } from '../../src/domain/rhythm';

type MockOptions = { existing?: boolean; snapshot?: Partial<RunState> };

const freshSnapshot = (overrides: Partial<RunState> = {}): RunState => ({
  runId: 'e2e-run-01', userOid: 'e2e-user', beatmapId: 'office-day-01', status: 'active',
  cursorMs: 0, nextEventIndex: 0, hearts: 5, combo: 0, maxCombo: 0,
  consecutivePerfects: 0, score: 0, perfectCount: 0, goodCount: 0, missCount: 0,
  updatedAt: new Date().toISOString(), ...overrides,
});

function createSession(snapshot: RunState = freshSnapshot()): GameSessionDocument {
  return {
    id: 'e2e-run-01', type: 'gameSession', userOid: 'e2e-user', tenantId: 'e2e-tenant',
    beatmapId: 'office-day-01', status: snapshot.status === 'paused' ? 'paused' : 'active',
    snapshot, inputEvents: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

export async function mockGameApi(page: Page, options: MockOptions = {}) {
  await page.addInitScript(() => window.sessionStorage.setItem('office-rhythm:e2e-auth', 'enabled'));

  let session: GameSessionDocument | null = options.existing
    ? createSession(freshSnapshot({ ...options.snapshot, status: 'paused' }))
    : null;
  let version = 1;
  let result: GameResultDocument | null = null;

  const envelope = () => ({ session: session ? { ...session, _etag: undefined } : null, version: `v${version}` });
  const fulfillSession = (route: Route, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(envelope()) });

  await page.route('**/api/game/session', async (route) => {
    if (route.request().method() === 'GET') return fulfillSession(route);
    if (!session) session = createSession(freshSnapshot(options.snapshot));
    return fulfillSession(route, 201);
  });

  await page.route('**/api/game/session/events', async (route) => {
    const body = route.request().postDataJSON() as { snapshot?: RunState; events?: GameSessionDocument['inputEvents'] };
    if (session && body.snapshot) session.snapshot = body.snapshot;
    if (session && body.events) session.inputEvents.push(...body.events);
    version += 1;
    return fulfillSession(route);
  });

  await page.route('**/api/game/session/pause', async (route) => {
    const body = route.request().postDataJSON() as { snapshot: RunState };
    if (session) {
      session.snapshot = { ...body.snapshot, status: 'paused' };
      session.status = 'paused';
    }
    version += 1;
    return fulfillSession(route);
  });

  await page.route('**/api/game/results', async (route) => {
    const body = route.request().postDataJSON() as { terminalStatus: GameResultDocument['status']; claimedSnapshot: RunState };
    const snapshot = body.claimedSnapshot;
    result = {
      id: 'e2e-result-01', type: 'gameResult', userOid: 'e2e-user', displayName: '테스트 리듬러',
      beatmapId: 'office-day-01', leaderboardKey: 'all-time', status: body.terminalStatus,
      score: snapshot.score, perfectCount: snapshot.perfectCount, goodCount: snapshot.goodCount,
      missCount: snapshot.missCount, maxCombo: snapshot.maxCombo, durationMs: 2100,
      playedAt: new Date().toISOString(), schemaVersion: 1,
    };
    if (session) session.snapshot = snapshot;
    version += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ result, session, version: `v${version}`, created: true }),
    });
  });

  await page.route('**/api/leaderboard**', async (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ items: result ? [result] : [], continuationToken: undefined }),
  }));

  return {
    getSession: () => session,
    getResult: () => result,
  };
}
