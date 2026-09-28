import type { Beatmap, BeatmapPattern, RhythmEvent } from "@/domain/rhythm";
import { findPattern } from "@/content/beatmaps/patternLibrary";
import { JUDGEMENT_WINDOWS } from "@/game/judgement/types";

export type PracticeChart = {
  beatmap: Beatmap;
  patternId: string;
  sourceAudioStartMs: number;
  sourceAudioEndMs: number;
  loopDurationMs: number;
};

export function createPracticeBeatmap(beatmap: Beatmap, patternId: string): PracticeChart {
  const pattern = findPattern(beatmap, patternId);
  if (!pattern || pattern.events.length === 0) throw new Error(`Unknown or empty pattern: ${patternId}`);

  const orderedEvents = [...pattern.events].sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
  const sourceAudioStartMs = orderedEvents[0].startMs;
  const finalEventMs = Math.max(...orderedEvents.map((event) => event.endMs ?? event.startMs));
  const beatDurationMs = 60_000 / beatmap.bpm;
  const safeTailMs = Math.max(beatDurationMs, JUDGEMENT_WINDOWS.goodMs + 1);
  const sourceAudioEndMs = finalEventMs + safeTailMs;
  const loopDurationMs = sourceAudioEndMs - sourceAudioStartMs;
  const events: RhythmEvent[] = orderedEvents.map((event, index) => ({
    ...event,
    id: `practice-${pattern.id}-${index}`,
    startMs: event.startMs - sourceAudioStartMs,
    endMs: event.endMs === undefined ? undefined : event.endMs - sourceAudioStartMs,
  }));
  const practicePattern: BeatmapPattern = {
    ...pattern,
    startMs: 0,
    endMs: loopDurationMs,
    eventIds: events.map((event) => event.id),
  };

  return {
    patternId,
    sourceAudioStartMs,
    sourceAudioEndMs,
    loopDurationMs,
    beatmap: {
      ...beatmap,
      events,
      patterns: [practicePattern],
      sections: [{ id: pattern.section, startMs: 0, endMs: loopDurationMs }],
    },
  };
}
