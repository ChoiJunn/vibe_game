import type { Beatmap, BeatmapPattern, RhythmEvent } from "@/domain/rhythm";
import { findPattern } from "@/content/beatmaps/patternLibrary";

export function createPracticeBeatmap(beatmap: Beatmap, patternId: string): Beatmap {
  const pattern = findPattern(beatmap, patternId);
  if (!pattern || pattern.events.length === 0) throw new Error(`Unknown pattern: ${patternId}`);
  const origin = pattern.events[0].startMs;
  const events: RhythmEvent[] = pattern.events.map((event, index) => ({
    ...event,
    id: `practice-${pattern.id}-${index}`,
    startMs: event.startMs - origin,
    endMs: event.endMs === undefined ? undefined : event.endMs - origin,
  }));
  const practicePattern: BeatmapPattern = {
    ...pattern,
    startMs: 0,
    endMs: Math.max(...events.map((event) => event.endMs ?? event.startMs)),
    eventIds: events.map((event) => event.id),
  };
  return {
    ...beatmap,
    events,
    patterns: [practicePattern],
    sections: [{ id: pattern.section, startMs: 0, endMs: practicePattern.endMs }],
  };
}
