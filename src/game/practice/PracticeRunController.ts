import type { Beatmap, Judgement } from "@/domain/rhythm";

export type PracticeRunStatus = "idle" | "playing" | "paused" | "completed" | "failed" | "exited";
export type PracticeRunSnapshot = {
  status: PracticeRunStatus;
  patternId: string;
  nextEventIndex: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  accuracy: number;
};

export class PracticeRunController {
  private snapshot: PracticeRunSnapshot;
  private readonly listeners = new Set<(snapshot: PracticeRunSnapshot) => void>();

  constructor(private readonly beatmap: Beatmap, private readonly onTerminal?: (snapshot: PracticeRunSnapshot) => void) {
    this.snapshot = this.createSnapshot("idle");
  }

  start(): void {
    this.snapshot = this.createSnapshot("playing");
    this.emit();
  }

  restart(): void { this.start(); }

  pause(): void {
    if (this.snapshot.status === "playing") { this.snapshot = { ...this.snapshot, status: "paused" }; this.emit(); }
  }

  resume(): void {
    if (this.snapshot.status === "paused") { this.snapshot = { ...this.snapshot, status: "playing" }; this.emit(); }
  }

  exit(): void {
    this.snapshot = { ...this.snapshot, status: "exited" };
    this.emit();
  }

  registerJudgement(judgement: Judgement): PracticeRunSnapshot {
    if (this.snapshot.status !== "playing") return this.snapshot;
    const next = {
      ...this.snapshot,
      nextEventIndex: this.snapshot.nextEventIndex + 1,
      perfectCount: this.snapshot.perfectCount + (judgement === "perfect" ? 1 : 0),
      goodCount: this.snapshot.goodCount + (judgement === "good" ? 1 : 0),
      missCount: this.snapshot.missCount + (judgement === "miss" ? 1 : 0),
    };
    const completed = next.nextEventIndex >= this.beatmap.events.length;
    this.snapshot = { ...next, status: completed ? "completed" : "playing", accuracy: calculateAccuracy(next) };
    this.emit();
    if (completed) this.onTerminal?.(this.snapshot);
    return this.snapshot;
  }

  subscribe(listener: (snapshot: PracticeRunSnapshot) => void): () => void { this.listeners.add(listener); listener(this.snapshot); return () => this.listeners.delete(listener); }
  getSnapshot(): PracticeRunSnapshot { return this.snapshot; }

  private createSnapshot(status: PracticeRunStatus): PracticeRunSnapshot {
    return { status, patternId: this.beatmap.patterns[0]?.id ?? "unknown", nextEventIndex: 0, perfectCount: 0, goodCount: 0, missCount: 0, accuracy: 0 };
  }

  private emit(): void { this.listeners.forEach((listener) => listener(this.snapshot)); }
}

export function calculateAccuracy(snapshot: Pick<PracticeRunSnapshot, "perfectCount" | "goodCount" | "missCount">): number {
  const total = snapshot.perfectCount + snapshot.goodCount + snapshot.missCount;
  return total === 0 ? 0 : Math.round(((snapshot.perfectCount * 100 + snapshot.goodCount * 60) / (total * 100)) * 100);
}
