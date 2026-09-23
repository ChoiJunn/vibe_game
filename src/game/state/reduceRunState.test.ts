import { describe, expect, it } from "vitest";
import type { JudgementResult } from "@/game/judgement/types";
import type { RhythmEvent } from "@/domain/rhythm";
import { createInitialRunState, reduceRunState } from "./reduceRunState";
import { calculateJudgementScore, getComboMultiplier } from "./scorePolicy";

function result(
  judgement: JudgementResult["judgement"],
  eventId = "event-01",
): JudgementResult {
  return { judgement, errorMs: 0, eventId };
}

function event(id: string, type: RhythmEvent["type"] = "tap"): RhythmEvent {
  return {
    id,
    type,
    startMs: 0,
    endMs: type === "hold" || type === "burst" ? 100 : undefined,
    section: "arrival",
    patternId: "test",
    patternKind: type === "burst" ? "burst" : "straight",
    requiredPresses: type === "burst" ? 2 : undefined,
  };
}

describe("reduceRunState", () => {
  it("applies score and multiplier after the judgement combo increments", () => {
    expect(getComboMultiplier(10)).toBe(1.1);
    expect(calculateJudgementScore(result("perfect"), 10)).toBe(110);

    const state = createInitialRunState({
      runId: "run-01",
      userOid: "user-01",
      beatmapId: "office-day-01",
    });
    const next = reduceRunState(state, {
      result: result("perfect"),
      event: event("event-01"),
      eventIndex: 0,
      songPositionMs: 100,
    });

    expect(next.score).toBe(100);
    expect(next.combo).toBe(1);
    expect(next.perfectCount).toBe(1);
  });

  it("restores one heart at every ten consecutive Perfect results, capped at five", () => {
    let state = createInitialRunState({
      runId: "run-02",
      userOid: "user-01",
      beatmapId: "office-day-01",
      hearts: 3,
    });

    for (let index = 0; index < 10; index += 1) {
      state = reduceRunState(state, {
        result: result("perfect", `event-${index}`),
        event: event(`event-${index}`),
        eventIndex: index,
        songPositionMs: index * 100,
      });
    }

    expect(state.hearts).toBe(4);
    expect(state.consecutivePerfects).toBe(10);

    let fullHeartState = createInitialRunState({
      runId: "run-02-full",
      userOid: "user-01",
      beatmapId: "office-day-01",
      hearts: 5,
    });
    for (let index = 0; index < 10; index += 1) {
      fullHeartState = reduceRunState(fullHeartState, {
        result: result("perfect", `full-event-${index}`),
        event: event(`full-event-${index}`),
        eventIndex: index,
        songPositionMs: index * 100,
      });
    }
    expect(fullHeartState.hearts).toBe(5);
  });

  it("resets combo on Good and fails when a Miss removes the last heart", () => {
    let state = createInitialRunState({
      runId: "run-03",
      userOid: "user-01",
      beatmapId: "office-day-01",
      hearts: 1,
    });
    state = reduceRunState(state, {
      result: result("perfect"),
      event: event("event-01"),
      eventIndex: 0,
      songPositionMs: 100,
    });
    state = reduceRunState(state, {
      result: result("good", "event-02"),
      event: event("event-02"),
      eventIndex: 1,
      songPositionMs: 200,
    });

    expect(state.combo).toBe(2);
    expect(state.consecutivePerfects).toBe(0);

    state = reduceRunState(state, {
      result: result("miss", "event-03"),
      event: event("event-03"),
      eventIndex: 2,
      songPositionMs: 300,
    });
    expect(state.status).toBe("failed");
    expect(state.hearts).toBe(0);
    expect(state.combo).toBe(0);
  });

  it("ignores duplicate or out-of-order event results and completes on the final event", () => {
    const state = createInitialRunState({
      runId: "run-04",
      userOid: "user-01",
      beatmapId: "office-day-01",
    });
    const action = {
      result: result("perfect"),
      event: event("event-01"),
      eventIndex: 0,
      songPositionMs: 100,
    };
    const next = reduceRunState(state, action);

    expect(reduceRunState(next, action)).toEqual(next);
    expect(
      reduceRunState(next, {
        result: result("perfect", "event-03"),
        event: event("event-03"),
        eventIndex: 2,
        songPositionMs: 300,
      }),
    ).toEqual(next);

    const completed = reduceRunState(next, {
      result: result("good", "event-02"),
      event: event("event-02"),
      eventIndex: 1,
      isFinalEvent: true,
      finalEventEndMs: 200,
      songPositionMs: 200,
    });
    expect(completed.status).toBe("completed");
  });

  it("awards four doubled-score charges after a successful burst", () => {
    let state = createInitialRunState({
      runId: "run-risk",
      userOid: "user-01",
      beatmapId: "office-day-01",
    });
    state = reduceRunState(state, {
      result: result("perfect", "burst-01"),
      event: event("burst-01", "burst"),
      eventIndex: 0,
      songPositionMs: 100,
    });
    expect(state.riskBonusRemaining).toBe(4);
    expect(state.riskSuccessCount).toBe(1);

    state = reduceRunState(state, {
      result: result("perfect", "tap-02"),
      event: event("tap-02"),
      eventIndex: 1,
      songPositionMs: 200,
    });
    expect(state.score).toBe(300);
    expect(state.riskBonusRemaining).toBe(3);
  });

  it("activates Fever at 100 gauge without changing judgement counts", () => {
    const state = {
      ...createInitialRunState({ runId: "run-fever", userOid: "user-01", beatmapId: "office-day-01" }),
      feverGauge: 90,
    };
    const feverState = reduceRunState(state, {
      result: result("perfect"),
      event: event("event-01"),
      eventIndex: 0,
      songPositionMs: 100,
    });
    expect(feverState.feverGauge).toBe(0);
    expect(feverState.feverActiveUntilMs).toBe(8100);
    expect(feverState.perfectCount).toBe(1);

    const next = reduceRunState(feverState, {
      result: result("good", "event-02"),
      event: event("event-02"),
      eventIndex: 1,
      songPositionMs: 1_000,
    });
    expect(next.score).toBe(175);
    expect(next.goodCount).toBe(1);
  });

  it("does not award risk charges after a failed burst", () => {
    const state = reduceRunState(createInitialRunState({ runId: "run-risk-miss", userOid: "user-01", beatmapId: "office-day-01" }), {
      result: result("miss", "burst-01"),
      event: event("burst-01", "burst"),
      eventIndex: 0,
      songPositionMs: 100,
    });
    expect(state.riskBonusRemaining).toBe(0);
    expect(state.riskFailureCount).toBe(1);
  });
});
