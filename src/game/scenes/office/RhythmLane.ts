import Phaser from 'phaser';
import type { RhythmEvent, SectionId } from '@/domain/rhythm';
import type { RhythmGameSnapshot } from '@/game/RhythmGameController';
import { GAME_ASSETS } from '@/game/assets';

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

export function resolveLaneOptions(options: RhythmLaneOptions = {}): ResolvedLaneOptions {
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
    lane.hitX + ((eventTimeMs - songPositionMs) / lane.travelMs) * lane.laneTravelWidth;
  const startX = project(event.startMs);
  const endX = event.type === 'hold' && event.endMs !== undefined ? project(event.endMs) : undefined;

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
  return event.startMs <= songPositionMs + lane.travelMs && lastRelevantMs >= songPositionMs - lane.visibleLateMs;
}

export function getNoteAssetKey(section: SectionId): string {
  return GAME_ASSETS.notes[section].key;
}

type LaneNoteVisual = {
  container: Phaser.GameObjects.Container;
  rail: Phaser.GameObjects.Graphics;
  motif: Phaser.GameObjects.Image;
};

export class RhythmLane {
  private readonly scene: Phaser.Scene;
  private readonly lane: ResolvedLaneOptions;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly notes = new Map<string, LaneNoteVisual>();

  constructor(scene: Phaser.Scene, options: RhythmLaneOptions = {}) {
    this.scene = scene;
    this.lane = resolveLaneOptions(options);
    this.frame = scene.add.graphics().setDepth(10).setScrollFactor(0);
    this.drawLaneFrame();
  }

  update(snapshot: RhythmGameSnapshot): void {
    const pendingEvents = snapshot.events.slice(snapshot.runState.nextEventIndex);
    const visibleEvents = pendingEvents.filter((event) =>
      isLaneEventVisible(event, snapshot.songPositionMs, this.lane),
    );
    const visibleIds = new Set(visibleEvents.map((event) => event.id));

    for (const event of visibleEvents) {
      const projection = projectLaneEvent(event, snapshot.songPositionMs, this.lane);
      const visual = this.notes.get(event.id) ?? this.createNote(event);
      visual.container.setPosition(projection.startX, this.lane.y);
      visual.motif.setTexture(getNoteAssetKey(event.section));
      visual.rail.clear();

      if (projection.endX !== undefined && projection.railWidth > 0) {
        const railLeft = Math.min(0, projection.endX - projection.startX);
        visual.rail.fillStyle(0xffe3a5, 0.95);
        visual.rail.fillRoundedRect(railLeft, -7, projection.railWidth, 14, 7);
        visual.rail.lineStyle(2, 0x6a4533, 0.9);
        visual.rail.strokeRoundedRect(railLeft, -7, projection.railWidth, 14, 7);
        visual.rail.fillStyle(0xfff8e9, 1);
        visual.rail.fillCircle(railLeft, 0, 6);
        visual.rail.fillCircle(railLeft + projection.railWidth, 0, 6);
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
    for (const visual of this.notes.values()) {
      visual.container.destroy(true);
    }
    this.notes.clear();
  }

  private createNote(event: RhythmEvent): LaneNoteVisual {
    const container = this.scene.add.container(0, this.lane.y).setDepth(12).setScrollFactor(0);
    const rail = this.scene.add.graphics();
    const motif = this.scene.add.image(0, 0, getNoteAssetKey(event.section))
      .setDisplaySize(72, 72);
    container.add([rail, motif]);
    const visual = { container, rail, motif };
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
}
