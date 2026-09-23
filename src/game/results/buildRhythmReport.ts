import type { PatternCodex } from "@/client/game/patternCodexStore";
import type { PatternKind } from "@/domain/rhythm";
import type { RhythmGameSnapshot } from "@/game/RhythmGameController";

export type RhythmReport = {
  accuracyPercent: number;
  timingBuckets: { perfect: number; good: number; miss: number };
  patternResults: Array<{ patternId: string; kind: PatternKind; accuracy: number; status: "strong" | "missed" }>;
  strongestPattern?: string;
  missedPattern?: string;
  riskSuccesses: number;
  riskFailures: number;
  feverActivations: number;
  earnedBadgeIds: string[];
  nextChallenge?: string;
};

export function buildRhythmReport(snapshot: RhythmGameSnapshot, codex: PatternCodex): RhythmReport {
  const timingBuckets = { perfect: snapshot.runState.perfectCount, good: snapshot.runState.goodCount, miss: snapshot.runState.missCount };
  const judged = timingBuckets.perfect + timingBuckets.good + timingBuckets.miss;
  const grouped = new Map<string, { kind: PatternKind; perfect: number; good: number; miss: number; order: number }>();
  snapshot.events.forEach((event, order) => {
    if (!grouped.has(event.patternId)) grouped.set(event.patternId, { kind: event.patternKind, perfect: 0, good: 0, miss: 0, order });
  });
  snapshot.judgementHistory.forEach((entry) => {
    const current = grouped.get(entry.patternId) ?? { kind: entry.patternKind, perfect: 0, good: 0, miss: 0, order: grouped.size };
    current[entry.judgement] += 1;
    grouped.set(entry.patternId, current);
  });
  const patternResults = [...grouped.entries()].map(([patternId, value]) => {
    const total = value.perfect + value.good + value.miss;
    const accuracy = total === 0 ? 0 : Math.round(((value.perfect * 100 + value.good * 60) / (total * 100)) * 100);
    return { patternId, kind: value.kind, accuracy, status: accuracy >= 80 ? "strong" as const : "missed" as const, _order: value.order, _judged: total, _misses: value.miss };
  });
  const strongest = [...patternResults].filter((item) => item._judged > 0).sort((a, b) => b.accuracy - a.accuracy || b._judged - a._judged || a._order - b._order)[0];
  const missed = [...patternResults].filter((item) => item._judged > 0).sort((a, b) => a.accuracy - b.accuracy || b._misses - a._misses || a._order - b._order)[0];
  const cleanedPatterns = patternResults.map((result) => ({ patternId: result.patternId, kind: result.kind, accuracy: result.accuracy, status: result.status }));
  const next = Object.values(codex.patterns).find((pattern) => !pattern.mastered);
  return {
    accuracyPercent: judged === 0 ? 0 : Math.round(((timingBuckets.perfect * 100 + timingBuckets.good * 60) / (judged * 100)) * 100),
    timingBuckets,
    patternResults: cleanedPatterns,
    strongestPattern: strongest?.patternId,
    missedPattern: missed?.patternId,
    riskSuccesses: snapshot.runState.riskSuccessCount,
    riskFailures: snapshot.runState.riskFailureCount,
    feverActivations: snapshot.runState.feverActiveUntilMs > 0 ? 1 : 0,
    earnedBadgeIds: codex.badges.map((badge) => badge.id),
    nextChallenge: next ? `다음 도전: ${next.patternId}` : "모든 패턴을 마스터했어요!",
  };
}
