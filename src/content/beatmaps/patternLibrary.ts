import type {
  Beatmap,
  BeatmapPattern,
  PatternKind,
  RhythmEvent,
  SectionId,
} from "@/domain/rhythm";

export type PatternKindPresentation = {
  kind: PatternKind;
  label: string;
  description: string;
};

export const PATTERN_KIND_PRESENTATION: Record<PatternKind, PatternKindPresentation> = {
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
};

export const PATTERN_KIND_ORDER: readonly PatternKind[] = [
  "straight",
  "offbeat",
  "transition",
  "hold",
  "rest",
  "burst",
];

export type PatternSummary = BeatmapPattern & {
  section: SectionId;
  eventCount: number;
  events: RhythmEvent[];
};

export type PatternGroup = PatternKindPresentation & {
  variations: PatternSummary[];
};

export function getPatternLibrary(beatmap: Beatmap): PatternSummary[] {
  return beatmap.patterns.map((pattern) => {
    const events = pattern.eventIds
      .map((eventId) => beatmap.events.find((event) => event.id === eventId))
      .filter((event): event is RhythmEvent => Boolean(event));
    return {
      ...pattern,
      section: events[0]?.section ?? "arrival",
      eventCount: events.length,
      events,
    };
  });
}

export function groupPatternsByKind(beatmap: Beatmap): PatternGroup[] {
  const patterns = getPatternLibrary(beatmap);

  return PATTERN_KIND_ORDER.flatMap((kind) => {
    const variations = patterns
      .filter((pattern) => pattern.kind === kind && pattern.eventCount > 0)
      .sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));

    return variations.length > 0
      ? [{ ...PATTERN_KIND_PRESENTATION[kind], variations }]
      : [];
  });
}

export function findPattern(beatmap: Beatmap, patternId: string): PatternSummary | undefined {
  return getPatternLibrary(beatmap).find((pattern) => pattern.id === patternId);
}
