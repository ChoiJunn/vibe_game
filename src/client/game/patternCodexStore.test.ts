import { describe, expect, it } from "vitest";
import { createEmptyCodex, getCodexStorageKey, loadPatternCodex, recordPatternPractice, savePatternCodex } from "./patternCodexStore";

function storage(): Storage {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key), clear: () => values.clear(), key: (index) => [...values.keys()][index] ?? null, get length() { return values.size; } };
}

describe("pattern codex storage", () => {
  it("separates anonymous and authenticated records and survives reload", () => {
    const store = storage();
    const codex = recordPatternPractice(createEmptyCodex("office-day-01"), { patternId: "p1", terminalStatus: "completed", accuracy: 96, now: "2026-09-23T00:00:00.000Z" });
    savePatternCodex(store, "oid-1", codex);
    expect(loadPatternCodex(store, "oid-1", "office-day-01").patterns.p1.mastered).toBe(true);
    expect(getCodexStorageKey(undefined, "office-day-01")).not.toBe(getCodexStorageKey("oid-1", "office-day-01"));
  });

  it("resets malformed data without touching another key", () => {
    const store = storage();
    store.setItem(getCodexStorageKey("oid-1", "office-day-01"), "not-json");
    expect(loadPatternCodex(store, "oid-1", "office-day-01")).toEqual(createEmptyCodex("office-day-01"));
  });

  it("keeps best accuracy and derives family badges deterministically", () => {
    let codex = createEmptyCodex("office-day-01");
    codex = recordPatternPractice(codex, { patternId: "burst", terminalStatus: "completed", accuracy: 100, perfectCount: 10, burstCompleted: true, now: "2026-09-23T00:00:00.000Z" });
    codex = recordPatternPractice(codex, { patternId: "burst", terminalStatus: "failed", accuracy: 20, now: "2026-09-23T00:01:00.000Z" });
    expect(codex.patterns.burst.attempts).toBe(2);
    expect(codex.patterns.burst.bestAccuracy).toBe(100);
    expect(codex.badges.map((badge) => badge.family)).toEqual(expect.arrayContaining(["skill", "pattern", "challenge"]));
  });
});
