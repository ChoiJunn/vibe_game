export type PatternMastery = {
  patternId: string;
  attempts: number;
  successes: number;
  bestAccuracy: number;
  mastered: boolean;
  lastPlayedAt: string;
};

export type PatternCodexBadge = {
  id: string;
  family: "skill" | "pattern" | "challenge";
  earnedAt: string;
};

export type PatternCodex = {
  schemaVersion: 1;
  beatmapId: string;
  patterns: Record<string, PatternMastery>;
  badges: PatternCodexBadge[];
};

export type PatternPracticeResult = {
  patternId: string;
  terminalStatus: "completed" | "failed";
  accuracy: number;
  perfectCount?: number;
  burstCompleted?: boolean;
  transitionCompleted?: boolean;
  now?: string;
};

export const CODEX_SCHEMA_VERSION = 1 as const;
export const ANONYMOUS_CODEX_USER = "anonymous-local";

export function getCodexStorageKey(userOid: string | undefined, beatmapId: string): string {
  return `office-rhythm-codex:v1:${userOid || ANONYMOUS_CODEX_USER}:${beatmapId}`;
}

export function createEmptyCodex(beatmapId: string): PatternCodex {
  return { schemaVersion: CODEX_SCHEMA_VERSION, beatmapId, patterns: {}, badges: [] };
}

export function loadPatternCodex(storage: Storage | undefined, userOid: string | undefined, beatmapId: string): PatternCodex {
  if (!storage) return createEmptyCodex(beatmapId);
  try {
    const raw = storage.getItem(getCodexStorageKey(userOid, beatmapId));
    if (!raw) return createEmptyCodex(beatmapId);
    const parsed = JSON.parse(raw) as Partial<PatternCodex>;
    if (parsed.schemaVersion !== CODEX_SCHEMA_VERSION || parsed.beatmapId !== beatmapId || !parsed.patterns || !Array.isArray(parsed.badges)) {
      return createEmptyCodex(beatmapId);
    }
    return { schemaVersion: 1, beatmapId, patterns: parsed.patterns, badges: parsed.badges };
  } catch {
    return createEmptyCodex(beatmapId);
  }
}

export function savePatternCodex(storage: Storage | undefined, userOid: string | undefined, codex: PatternCodex): PatternCodex {
  if (storage) storage.setItem(getCodexStorageKey(userOid, codex.beatmapId), JSON.stringify(codex));
  return codex;
}

export function recordPatternPractice(codex: PatternCodex, result: PatternPracticeResult): PatternCodex {
  const now = result.now ?? new Date().toISOString();
  const previous = codex.patterns[result.patternId] ?? {
    patternId: result.patternId, attempts: 0, successes: 0, bestAccuracy: 0, mastered: false, lastPlayedAt: now,
  };
  const accuracy = clampAccuracy(result.accuracy);
  const next: PatternCodex = {
    ...codex,
    patterns: {
      ...codex.patterns,
      [result.patternId]: {
        ...previous,
        attempts: previous.attempts + 1,
        successes: previous.successes + (result.terminalStatus === "completed" ? 1 : 0),
        bestAccuracy: Math.max(previous.bestAccuracy, accuracy),
        mastered: previous.mastered || (result.terminalStatus === "completed" && accuracy >= 95),
        lastPlayedAt: now,
      },
    },
  };
  return { ...next, badges: deriveBadges(next, result, now) };
}

export function deriveBadges(codex: PatternCodex, latest: PatternPracticeResult, now: string): PatternCodexBadge[] {
  const badges = new Map(codex.badges.map((badge) => [badge.id, badge]));
  const mastered = Object.values(codex.patterns).filter((pattern) => pattern.mastered);
  const add = (id: string, family: PatternCodexBadge["family"]) => {
    if (!badges.has(id)) badges.set(id, { id, family, earnedAt: now });
  };
  if (latest.terminalStatus === "completed" && latest.accuracy >= 95) add("skill-accuracy-ace", "skill");
  if (latest.terminalStatus === "completed" && (latest.perfectCount ?? 0) >= 10) add("skill-perfect-streak", "skill");
  if (mastered.length >= 1) add("pattern-first-master", "pattern");
  if (mastered.length >= 3) add("pattern-trio-master", "pattern");
  if (latest.burstCompleted) add("challenge-burst-breaker", "challenge");
  if (latest.transitionCompleted) add("challenge-shift-specialist", "challenge");
  if (mastered.length > 0 && Object.values(codex.patterns).every((pattern) => pattern.mastered)) add("challenge-full-codex", "challenge");
  return [...badges.values()];
}

function clampAccuracy(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}
