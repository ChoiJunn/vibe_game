import Phaser from "phaser";
import type { RhythmEvent, SectionId } from "@/domain/rhythm";
import type { RhythmGameSnapshot } from "@/game/RhythmGameController";
import { GAME_ASSETS } from "@/game/assets";

export type RhythmLaneOptions = {
  hitX?: number;
  y?: number;
  travelMs?: number;
  visibleLateMs?: number;
  laneTravelWidth?: number;
};

type ResolvedLaneOptions = Required<RhythmLaneOptions>;

export type LaneEventProjection = {
  startX: number;
  endX?: number;
  railWidth: number;
};

export type PatternCue = { symbol: string; label: string; color: number };

export function getPatternCue(event: RhythmEvent): PatternCue {
  if (event.type === "burst" || event.patternKind === "burst") return { symbol: "⚡", label: "BURST", color: 0xff8d5c };
  if (event.type === "hold" || event.patternKind === "hold") return { symbol: "↔", label: "HOLD", color: 0x79c7ad };
  switch (event.patternKind) {
    case "offbeat": return { symbol: "◈", label: "OFFBEAT", color: 0xffc45d };
    case "transition": return { symbol: "➜", label: "SHIFT", color: 0xb69cff };
    case "rest": return { symbol: "· · ·", label: "BREATH", color: 0xc9d4d1 };
    default: return { symbol: "●", label: "BEAT", color: 0xfff1d2 };
  }
}

export function resolveLaneOptions(
  options: RhythmLaneOptions = {},
): ResolvedLaneOptions {
  return {
    hitX: options.hitX ?? 640,
    y: options.y ?? 520,
    travelMs: options.travelMs ?? 2_400,
    visibleLateMs: options.visibleLateMs ?? 160,
    laneTravelWidth: options.laneTravelWidth ?? 520,
  };
}

export function projectLaneEvent(
  event: RhythmEvent,
  songPositionMs: number,
  options: RhythmLaneOptions = {},
): LaneEventProjection {
  const lane = resolveLaneOptions(options);
  const project = (eventTimeMs: number) =>
    lane.hitX +
    ((eventTimeMs - songPositionMs) / lane.travelMs) * lane.laneTravelWidth;
  const startX = project(event.startMs);
  const endX =
    (event.type === "hold" || event.type === "burst") && event.endMs !== undefined
      ? project(event.endMs)
      : undefined;

  return endX === undefined
    ? { startX, railWidth: 0 }
    : { startX, endX, railWidth: Math.abs(endX - startX) };
}

export function isLaneEventVisible(
  event: RhythmEvent,
  songPositionMs: number,
  options: RhythmLaneOptions = {},
): boolean {
  const lane = resolveLaneOptions(options);
  const lastRelevantMs = event.endMs ?? event.startMs;
  return (
    event.startMs <= songPositionMs + lane.travelMs &&
    lastRelevantMs >= songPositionMs - lane.visibleLateMs
  );
}

export function getNoteAssetKey(section: SectionId): string {
  return GAME_ASSETS.notes[section].key;
}

type LaneNoteVisual = {
  container: Phaser.GameObjects.Container;
  rail: Phaser.GameObjects.Graphics;
  motif: Phaser.GameObjects.Image;
  cue: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
};

export class RhythmLane {
  private readonly scene: Phaser.Scene;
  private readonly lane: ResolvedLaneOptions;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly holdProgress: Phaser.GameObjects.Graphics;
  private readonly holdStatus: Phaser.GameObjects.Text;
  private readonly notes = new Map<string, LaneNoteVisual>();

  constructor(scene: Phaser.Scene, options: RhythmLaneOptions = {}) {
    this.scene = scene;
    this.lane = resolveLaneOptions(options);
    this.frame = scene.add.graphics().setDepth(10).setScrollFactor(0);
    this.holdProgress = scene.add.graphics().setDepth(14).setScrollFactor(0);
    this.holdStatus = scene.add
      .text(this.lane.hitX, this.lane.y - 106, "", {
        color: "#fff8e9",
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        stroke: "#182a31",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(14)
      .setScrollFactor(0)
      .setAlpha(0);
    this.drawLaneFrame();
  }

  update(snapshot: RhythmGameSnapshot): void {
    this.updateHoldFeedback(snapshot);
    const pendingEvents = snapshot.events.slice(
      snapshot.runState.nextEventIndex,
    );
    const visibleEvents = pendingEvents.filter((event) =>
      isLaneEventVisible(event, snapshot.songPositionMs, this.lane),
    );
    const visibleIds = new Set(visibleEvents.map((event) => event.id));

    for (const event of visibleEvents) {
      const projection = projectLaneEvent(
        event,
        snapshot.songPositionMs,
        this.lane,
      );
      const visual = this.notes.get(event.id) ?? this.createNote(event);
      const activeHold =
        snapshot.currentEvent?.id === event.id &&
        snapshot.holdState?.phase === "holding";
      const activeBurst =
        snapshot.currentEvent?.id === event.id &&
        snapshot.burstState?.eventId === event.id;
      const cue = getPatternCue(event);
      visual.container.setPosition(projection.startX, this.lane.y);
      visual.motif.setTexture(getNoteAssetKey(event.section));
      visual.motif.setTint(activeHold || activeBurst ? cue.color : 0xffffff);
      visual.cue.setText(cue.symbol).setColor(`#${cue.color.toString(16).padStart(6, "0")}`);
      visual.label.setText(activeBurst
        ? `BURST ${snapshot.burstState?.completedPresses ?? 0}/${snapshot.burstState?.requiredPresses ?? event.requiredPresses ?? 0}`
        : cue.label);
      visual.rail.clear();

      if (projection.endX !== undefined && projection.railWidth > 0) {
        const railLeft = Math.min(0, projection.endX - projection.startX);
        visual.rail.fillStyle(activeHold || activeBurst ? cue.color : 0xffe3a5, 0.95);
        visual.rail.fillRoundedRect(railLeft, -7, projection.railWidth, 14, 7);
        visual.rail.lineStyle(2, 0x6a4533, 0.9);
        visual.rail.strokeRoundedRect(
          railLeft,
          -7,
          projection.railWidth,
          14,
          7,
        );
        visual.rail.fillStyle(0xfff8e9, 1);
        visual.rail.fillCircle(railLeft, 0, 6);
        visual.rail.fillCircle(railLeft + projection.railWidth, 0, 6);
        if (activeBurst) {
          visual.rail.fillStyle(0xffffff, 0.95);
          visual.rail.fillRect(railLeft, 10, projection.railWidth * (snapshot.burstState?.progress ?? 0), 5);
        }
      }
    }

    for (const [eventId, visual] of this.notes) {
      if (!visibleIds.has(eventId)) {
        visual.container.destroy(true);
        this.notes.delete(eventId);
      }
    }
  }

  destroy(): void {
    this.frame.destroy();
    this.holdProgress.destroy();
    this.holdStatus.destroy();
    for (const visual of this.notes.values()) {
      visual.container.destroy(true);
    }
    this.notes.clear();
  }

  private createNote(event: RhythmEvent): LaneNoteVisual {
    const container = this.scene.add
      .container(0, this.lane.y)
      .setDepth(12)
      .setScrollFactor(0);
    const rail = this.scene.add.graphics();
    const motif = this.scene.add
      .image(0, 0, getNoteAssetKey(event.section))
      .setDisplaySize(72, 72);
    const cue = this.scene.add.text(0, -44, getPatternCue(event).symbol, {
      color: "#fff1d2",
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "bold",
      stroke: "#182a31",
      strokeThickness: 4,
    }).setOrigin(0.5);
    const label = this.scene.add.text(0, 45, getPatternCue(event).label, {
      color: "#fff8e9",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      fontStyle: "bold",
      stroke: "#182a31",
      strokeThickness: 3,
    }).setOrigin(0.5);
    container.add([rail, motif, cue, label]);
    const visual = { container, rail, motif, cue, label };
    this.notes.set(event.id, visual);
    return visual;
  }

  private drawLaneFrame(): void {
    const { hitX, y } = this.lane;
    this.frame.fillStyle(0x182a31, 0.82);
    this.frame.fillRoundedRect(96, y - 66, 1088, 132, 24);
    this.frame.lineStyle(3, 0xfff1d2, 0.82);
    this.frame.strokeRoundedRect(96, y - 66, 1088, 132, 24);
    this.frame.lineStyle(2, 0xf4c86c, 0.65);
    this.frame.lineBetween(118, y + 47, 1162, y + 47);
    this.frame.lineStyle(8, 0xffd46f, 1);
    this.frame.lineBetween(hitX, y - 58, hitX, y + 58);
    this.frame.fillStyle(0xfff4d1, 1);
    this.frame.fillCircle(hitX, y, 13);
    this.frame.fillStyle(0xd88143, 1);
    this.frame.fillCircle(hitX, y, 7);
  }

  private updateHoldFeedback(snapshot: RhythmGameSnapshot): void {
    const event = snapshot.currentEvent;
    if (event?.type === "burst" && snapshot.burstState) {
      const burst = snapshot.burstState;
      this.holdProgress.clear();
      this.holdProgress.fillStyle(0x182a31, 0.92);
      this.holdProgress.fillRoundedRect(this.lane.hitX - 132, this.lane.y - 92, 264, 14, 7);
      this.holdProgress.fillStyle(0xff8d5c, 1);
      this.holdProgress.fillRoundedRect(this.lane.hitX - 132, this.lane.y - 92, 264 * burst.progress, 14, 7);
      this.holdStatus.setText(`BURST  ${burst.completedPresses}/${burst.requiredPresses}  ·  스페이스 연타`).setColor("#fff1d2").setAlpha(1);
      return;
    }
    const hold = snapshot.holdState;
    if (!event || event.type !== "hold" || !hold) {
      this.holdProgress.clear();
      this.holdStatus.setAlpha(0);
      return;
    }

    const progress = Math.round(hold.progress * 100);
    this.holdProgress.clear();
    this.holdProgress.fillStyle(0x243e43, 0.9);
    this.holdProgress.fillRoundedRect(
      this.lane.hitX - 132,
      this.lane.y - 92,
      264,
      12,
      6,
    );
    const startJudgement = hold.startJudgement?.judgement;
    const holdingColor = startJudgement === "miss" ? 0xf08f83 : 0x79c7ad;
    this.holdProgress.fillStyle(
      hold.phase === "holding" ? holdingColor : 0xffd46f,
      1,
    );
    this.holdProgress.fillRoundedRect(
      this.lane.hitX - 132,
      this.lane.y - 92,
      264 * hold.progress,
      12,
      6,
    );
    const startLabel = startJudgement
      ? `시작 ${startJudgement.toUpperCase()}`
      : "시작 대기";
    this.holdStatus
      .setText(
        hold.phase === "holding"
          ? `HOLDING  ${progress}%  ·  ${startLabel}  ·  끝까지 유지`
          : "HOLD  ·  스페이스를 누르고 끝까지 유지",
      )
      .setColor(
        hold.phase === "holding" && startJudgement === "miss"
          ? "#f08f83"
          : hold.phase === "holding"
            ? "#79c7ad"
            : "#fff8e9",
      )
      .setAlpha(1);
  }
}
