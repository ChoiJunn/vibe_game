export type NoteType = "tap" | "hold" | "burst";
export type Judgement = "perfect" | "good" | "miss";
export type PatternKind =
  "straight" | "offbeat" | "transition" | "hold" | "rest" | "burst";

export type SectionId =
  "arrival" | "keyboard" | "mail" | "meeting" | "copy" | "departure";

export type RhythmEvent = {
  id: string;
  type: NoteType;
  startMs: number;
  endMs?: number;
  section: SectionId;
  patternId: string;
  patternKind: PatternKind;
  requiredPresses?: number;
};

export type BurstRhythmEvent = RhythmEvent & {
  type: "burst";
  endMs: number;
  requiredPresses: number;
};

export function isBurstRhythmEvent(
  event: RhythmEvent,
): event is BurstRhythmEvent {
  return (
    event.type === "burst" &&
    typeof event.endMs === "number" &&
    typeof event.requiredPresses === "number"
  );
}

export type BeatmapPattern = {
  id: string;
  kind: PatternKind;
  label: string;
  startMs: number;
  endMs: number;
  eventIds: string[];
};

export type Beatmap = {
  id: "office-day-01";
  bpm: number;
  timeSignature: [4, 4];
  events: RhythmEvent[];
  patterns: BeatmapPattern[];
  sections: Array<{ id: SectionId; startMs: number; endMs: number }>;
};

export type RunState = {
  runId: string;
  userOid: string;
  beatmapId: string;
  status: "active" | "paused" | "completed" | "failed" | "abandoned";
  cursorMs: number;
  nextEventIndex: number;
  hearts: number;
  combo: number;
  maxCombo: number;
  consecutivePerfects: number;
  score: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  riskBonusRemaining: number;
  feverGauge: number;
  feverActiveUntilMs: number;
  riskSuccessCount: number;
  riskFailureCount: number;
  updatedAt: string;
};

export const SECTION_ORDER: readonly SectionId[] = [
  "arrival",
  "keyboard",
  "mail",
  "meeting",
  "copy",
  "departure",
];
