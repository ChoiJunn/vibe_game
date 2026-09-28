import { describe, expect, it } from "vitest";
import beatmapJson from "@/content/beatmaps/office-day-01.json";
import { validateBeatmap } from "@/domain/validateBeatmap";
import { createPracticeBeatmap } from "./createPracticeBeatmap";

const beatmap = validateBeatmap(beatmapJson);

describe("createPracticeBeatmap", () => {
  it("preserves source event IDs as metadata and maps timing into a padded local audio region", () => {
    const sourcePattern = beatmap.patterns.find(({ kind }) => kind === "burst")!;
    const chart = createPracticeBeatmap(beatmap, sourcePattern.id);
    const sourceEvents = sourcePattern.eventIds.map((id) => beatmap.events.find((event) => event.id === id)!);
    const lastSourceEvent = sourceEvents[sourceEvents.length - 1];
    const safeTailMs = Math.max(60_000 / beatmap.bpm, 161);

    expect(chart.patternId).toBe(sourcePattern.id);
    expect(chart.sourceAudioStartMs).toBe(sourceEvents[0].startMs);
    expect(chart.sourceAudioEndMs).toBe((lastSourceEvent.endMs ?? lastSourceEvent.startMs) + safeTailMs);
    expect(chart.loopDurationMs).toBe(chart.sourceAudioEndMs - chart.sourceAudioStartMs);
    expect(chart.beatmap.bpm).toBe(beatmap.bpm);
    expect(chart.beatmap.timeSignature).toEqual(beatmap.timeSignature);
    expect(chart.beatmap.sections[0].endMs).toBe(chart.loopDurationMs);
    expect(chart.beatmap.events).toHaveLength(sourceEvents.length);

    chart.beatmap.events.forEach((event, index) => {
      const source = sourceEvents[index];
      expect(event.id).toBe(`practice-${sourcePattern.id}-${index}`);
      expect(event.startMs + chart.sourceAudioStartMs).toBe(source.startMs);
      expect(event.endMs === undefined ? undefined : event.endMs + chart.sourceAudioStartMs).toBe(source.endMs);
      expect(event).toMatchObject({
        type: source.type,
        section: source.section,
        patternId: source.patternId,
        patternKind: source.patternKind,
      });
      expect(event.requiredPresses).toBe(source.requiredPresses);
    });
  });

  it("rejects unknown patterns rather than substituting another phrase", () => {
    expect(() => createPracticeBeatmap(beatmap, "does-not-exist")).toThrow("Unknown or empty pattern");
  });
});
