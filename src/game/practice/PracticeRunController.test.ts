import { describe, expect, it } from "vitest";
import type { Beatmap } from "@/domain/rhythm";
import { PracticeRunController } from "./PracticeRunController";

const beatmap = { id: "office-day-01", bpm: 110, timeSignature: [4, 4], events: [
  { id: "practice-1", type: "tap", startMs: 0, section: "arrival", patternId: "p1", patternKind: "straight" },
  { id: "practice-2", type: "tap", startMs: 500, section: "arrival", patternId: "p1", patternKind: "straight" },
], patterns: [{ id: "p1", kind: "straight", label: "테스트", startMs: 0, endMs: 500, eventIds: ["practice-1", "practice-2"] }], sections: [{ id: "arrival", startMs: 0, endMs: 500 }] } as Beatmap;

describe("PracticeRunController", () => {
  it("grades a selected pattern and calls terminal callback once", () => {
    let terminal = 0;
    const controller = new PracticeRunController(beatmap, () => { terminal += 1; });
    controller.start();
    controller.registerJudgement("perfect");
    const snapshot = controller.registerJudgement("good");
    expect(snapshot.status).toBe("completed");
    expect(snapshot.accuracy).toBe(80);
    expect(terminal).toBe(1);
  });

  it("pauses without consuming an input and supports restart/exit", () => {
    const controller = new PracticeRunController(beatmap);
    controller.start();
    controller.pause();
    controller.registerJudgement("perfect");
    expect(controller.getSnapshot().nextEventIndex).toBe(0);
    controller.resume();
    controller.restart();
    expect(controller.getSnapshot().nextEventIndex).toBe(0);
    controller.exit();
    expect(controller.getSnapshot().status).toBe("exited");
  });
});
