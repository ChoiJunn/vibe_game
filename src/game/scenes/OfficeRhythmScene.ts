import Phaser from 'phaser';
import type { RhythmGameController, RhythmGameSnapshot } from '../RhythmGameController';
import { OfficeBackground, renderOfficeBackground } from './office/OfficeBackground';
import { OfficeCharacter } from './office/OfficeCharacter';
import { GameHud } from './office/GameHud';
import { JudgementFeedback } from './office/JudgementFeedback';
import { TimingGauge } from './office/TimingGauge';
import { WorkIconPrompt } from './office/WorkIconPrompt';

export class OfficeRhythmScene extends Phaser.Scene {
  private readonly controller: RhythmGameController;
  private background!: OfficeBackground;
  private character!: OfficeCharacter;
  private gauge!: TimingGauge;
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
    this.character = new OfficeCharacter(this, 640, 430);
    this.gauge = new TimingGauge(this, 640, 180, 520);
    this.prompt = new WorkIconPrompt(this, 640, 300);
    this.hud = new GameHud(this);
    this.feedback = new JudgementFeedback(this, 640, 115);
    this.unsubscribe = this.controller.subscribe((snapshot) => this.renderSnapshot(snapshot));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
  }

  update(): void {
    this.renderSnapshot(this.controller.getSnapshot());
  }

  private renderSnapshot(snapshot: RhythmGameSnapshot): void {
    if (!this.background || !this.character) {
      return;
    }

    renderOfficeBackground(this.background, snapshot.section);
    this.character.update(snapshot.clockState, snapshot.lastJudgement?.judgement);
    this.gauge.update(snapshot.currentEvent, snapshot.songPositionMs);
    this.prompt.update(snapshot.section, snapshot.currentEvent?.type, snapshot.clockState);
    this.hud.update(snapshot);

    if (snapshot.lastJudgement && snapshot.lastJudgement !== this.feedback.lastResult) {
      this.feedback.show(snapshot.lastJudgement.judgement);
      this.feedback.lastResult = snapshot.lastJudgement;
    }
  }
}
