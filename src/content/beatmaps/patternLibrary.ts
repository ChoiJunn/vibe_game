import type { Beatmap, BeatmapPattern, RhythmEvent, SectionId } from "@/domain/rhythm";

export type PatternSummary = BeatmapPattern & {
  section: SectionId;
  eventCount: number;
  events: RhythmEvent[];
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

export function findPattern(beatmap: Beatmap, patternId: string): PatternSummary | undefined {
  return getPatternLibrary(beatmap).find((pattern) => pattern.id === patternId);
}
