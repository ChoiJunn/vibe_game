import { describe, expect, it } from "vitest";
import beatmapJson from "@/content/beatmaps/office-day-01.json";
import { validateBeatmap } from "@/domain/validateBeatmap";
import {
  groupPatternsByKind,
  getPatternLibrary,
  PATTERN_KIND_ORDER,
  PATTERN_KIND_PRESENTATION,
} from "./patternLibrary";

const beatmap = validateBeatmap(beatmapJson);

describe("pattern library grouping", () => {
  it("provides a Korean name and plain-language explanation for every kind", () => {
    expect(PATTERN_KIND_PRESENTATION).toEqual({
      straight: {
        kind: "straight",
        label: "정박",
        description: "일정한 박 위에 맞춰 누르는 기본 리듬",
      },
      offbeat: {
        kind: "offbeat",
        label: "엇박",
        description: "박 사이의 빈틈에 들어가는 리듬",
      },
      transition: {
        kind: "transition",
        label: "박자 전환",
        description: "정박에서 엇박 등 다른 흐름으로 바뀌는 리듬",
      },
      hold: {
        kind: "hold",
        label: "길게 누르기",
        description: "시작 박에 누르고 끝 박까지 유지하는 리듬",
      },
      rest: {
        kind: "rest",
        label: "쉼표",
        description: "표시된 쉬는 구간에는 누르지 않는 리듬",
      },
      burst: {
        kind: "burst",
        label: "빠른 연타",
        description: "정해진 시간 안에 여러 번 눌렀다 떼는 리듬",
      },
    });
  });

  it("groups all 45 authored variations once and retains their source events", () => {
    const groups = groupPatternsByKind(beatmap);
    const variations = groups.flatMap((group) => group.variations);
    const ids = variations.map((pattern) => pattern.id);

    expect(Object.fromEntries(groups.map(({ kind, variations: items }) => [kind, items.length]))).toEqual({
      straight: 17,
      offbeat: 13,
      transition: 4,
      hold: 5,
      burst: 6,
    });
    expect(groups.map(({ kind }) => kind)).toEqual([
      "straight",
      "offbeat",
      "transition",
      "hold",
      "burst",
    ]);
    expect(new Set(ids).size).toBe(45);
    expect([...ids].sort()).toEqual(beatmap.patterns.map(({ id }) => id).sort());

    for (const pattern of variations) {
      expect(pattern.eventCount).toBe(4);
      expect(pattern.events.map(({ id }) => id)).toEqual(pattern.eventIds);
    }
    expect(getPatternLibrary(beatmap)).toHaveLength(45);
  });

  it("uses canonical kind order, includes newly populated rest, and sorts ties by id", () => {
    const withRest = structuredClone(beatmap);
    const firstStraight = withRest.patterns.find(({ kind }) => kind === "straight")!;
    const secondStraight = withRest.patterns.find(
      ({ kind, id }) => kind === "straight" && id !== firstStraight.id,
    )!;
    const firstEvents = withRest.events.filter(({ patternId }) => patternId === firstStraight.id);

    firstStraight.kind = "rest";
    firstEvents.forEach((event) => {
      event.patternKind = "rest";
    });
    firstStraight.startMs = secondStraight.startMs;
    firstStraight.id = "z-rest-variation";
    firstEvents.forEach((event) => {
      event.patternId = firstStraight.id;
    });

    const groups = groupPatternsByKind(withRest);
    const kinds = groups.map(({ kind }) => kind);
    const straight = groups.find(({ kind }) => kind === "straight")!;
    const sameTimeStraight = straight.variations.filter(
      ({ startMs }) => startMs === secondStraight.startMs,
    );

    expect(kinds).toEqual(PATTERN_KIND_ORDER.filter((kind) => kinds.includes(kind)));
    expect(kinds).toContain("rest");
    expect(sameTimeStraight.map(({ id }) => id)).toEqual(
      [...sameTimeStraight.map(({ id }) => id)].sort((a, b) => a.localeCompare(b)),
    );
    expect(groups.find(({ kind }) => kind === "rest")?.variations).toHaveLength(1);
  });

  it("keeps phrases with the same kind and section as distinct variations", () => {
    const groups = groupPatternsByKind(beatmap);
    const straight = groups.find(({ kind }) => kind === "straight")!;
    const sameSection = straight.variations.filter(({ section }) => section === "arrival");

    expect(sameSection.length).toBeGreaterThan(1);
    expect(new Set(sameSection.map(({ id }) => id)).size).toBe(sameSection.length);
  });
});
