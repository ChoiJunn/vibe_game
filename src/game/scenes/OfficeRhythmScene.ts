import Phaser from 'phaser';
import type { Judgement } from '@/domain/rhythm';
import type { RhythmGameController, RhythmGameSnapshot } from '../RhythmGameController';
import { OfficeBackground } from './office/OfficeBackground';
import { OfficeCharacter } from './office/OfficeCharacter';
import { MokaCompanion } from './office/MokaCompanion';
import { GameHud } from './office/GameHud';
import { isNewJudgementEvent, JudgementFeedback } from './office/JudgementFeedback';
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
    this.character = new OfficeCharacter(this, 320, 690);
    this.moka = new MokaCompanion(this, 320, 690);
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

    let newJudgement: Judgement | undefined;
    if (isNewJudgementEvent(this.feedback.lastEventId, snapshot.lastJudgement)) {
      newJudgement = snapshot.lastJudgement.judgement;
      this.feedback.lastEventId = snapshot.lastJudgement.eventId;
      this.feedback.show(newJudgement);
    }

    this.background.update(snapshot.section, snapshot.songPositionMs, snapshot.runState.combo, newJudgement);
    this.character.update(snapshot.clockState, snapshot.songPositionMs, newJudgement, snapshot.runState.combo);
    this.moka.update(snapshot.section, newJudgement, snapshot.runState.combo);
    this.lane.update(snapshot);
    this.prompt.update(snapshot.section, snapshot.currentEvent?.type, snapshot.clockState);
    this.hud.update(snapshot);

  }
}
