import { describe, expect, it } from "vitest";
import type { RhythmGameSnapshot } from "@/game/RhythmGameController";
import { createEmptyCodex } from "@/client/game/patternCodexStore";
import { buildRhythmReport } from "./buildRhythmReport";

const snapshot = (history: RhythmGameSnapshot["judgementHistory"], counts = { perfectCount: 2, goodCount: 1, missCount: 1 }) => ({
  runState: { ...counts, riskSuccessCount: 2, riskFailureCount: 1, feverActiveUntilMs: 4_000 },
  events: [{ id: "e1", patternId: "straight", patternKind: "straight" }, { id: "e2", patternId: "burst", patternKind: "burst" }],
  judgementHistory: history,
} as unknown as RhythmGameSnapshot);

describe("buildRhythmReport", () => {
  it("calculates accuracy independently from bonus score and selects strongest/missed patterns", () => {
    const report = buildRhythmReport(snapshot([
      { eventId: "e1", patternId: "straight", patternKind: "straight", judgement: "perfect" },
      { eventId: "e2", patternId: "burst", patternKind: "burst", judgement: "miss" },
    ]), createEmptyCodex("office-day-01"));
    expect(report.accuracyPercent).toBe(65);
    expect(report.strongestPattern).toBe("straight");
    expect(report.missedPattern).toBe("burst");
    expect(report.riskSuccesses).toBe(2);
  });
});
