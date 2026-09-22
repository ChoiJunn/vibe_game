import Phaser from 'phaser';
import type { RhythmGameController, RhythmGameSnapshot } from '../RhythmGameController';
import { OfficeBackground } from './office/OfficeBackground';
import { OfficeCharacter } from './office/OfficeCharacter';
import { MokaCompanion } from './office/MokaCompanion';
import { GameHud } from './office/GameHud';
import { JudgementFeedback } from './office/JudgementFeedback';
import { RhythmLane } from './office/RhythmLane';
import { WorkIconPrompt } from './office/WorkIconPrompt';

export class OfficeRhythmScene extends Phaser.Scene {
  private readonly controller: RhythmGameController;
  private background!: OfficeBackground;
  private character!: OfficeCharacter;
  private moka!: MokaCompanion;
  private lane!: RhythmLane;
  private prompt!: WorkIconPrompt;
  private hud!: GameHud;
  private feedback!: JudgementFeedback;
  private unsubscribe?: () => void;

  constructor(controller: RhythmGameController) {
    super({ key: 'OfficeRhythmScene' });
    this.controller = controller;
  }

  create(): void {
    this.background = new OfficeBackground(this);
    this.character = new OfficeCharacter(this, 430, 668);
    this.moka = new MokaCompanion(this, 430, 668);
    this.lane = new RhythmLane(this);
    this.prompt = new WorkIconPrompt(this, 640, 300);
    this.hud = new GameHud(this);
    this.feedback = new JudgementFeedback(this, 640, 115);
    this.unsubscribe = this.controller.subscribe((snapshot) => this.renderSnapshot(snapshot));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
  }

  update(): void {
    this.controller.update();
    this.renderSnapshot(this.controller.getSnapshot());
  }

  private renderSnapshot(snapshot: RhythmGameSnapshot): void {
    if (!this.background || !this.character) {
      return;
    }

    this.background.update(snapshot.section, snapshot.songPositionMs);
    this.character.update(snapshot.clockState, snapshot.songPositionMs);
    this.moka.update(snapshot.section, snapshot.runState.combo);
    this.lane.update(snapshot);
    this.prompt.update(snapshot.section, snapshot.currentEvent?.type, snapshot.clockState);
    this.hud.update(snapshot);

    if (snapshot.lastJudgement && snapshot.lastJudgement !== this.feedback.lastResult) {
      this.feedback.show(snapshot.lastJudgement.judgement);
      this.feedback.lastResult = snapshot.lastJudgement;
    }
  }
}
