import { describe, expect, it } from "vitest";
import type { JudgementResult } from "@/game/judgement/types";
import { calculateJudgementScore } from "./scorePolicy";

const result = (judgement: JudgementResult["judgement"]): JudgementResult => ({
  judgement,
  errorMs: 0,
  eventId: "test-event",
});

describe("score policy bonuses", () => {
  it("keeps accuracy score primary and applies bounded bonuses separately", () => {
    expect(calculateJudgementScore(result("perfect"), 1)).toBe(100);
    expect(calculateJudgementScore(result("perfect"), 1, { riskBonus: true })).toBe(200);
    expect(calculateJudgementScore(result("perfect"), 1, { feverActive: true })).toBe(125);
    expect(calculateJudgementScore(result("perfect"), 1, { riskBonus: true, feverActive: true })).toBe(225);
    expect(calculateJudgementScore(result("miss"), 1, { riskBonus: true, feverActive: true })).toBe(0);
  });
});
