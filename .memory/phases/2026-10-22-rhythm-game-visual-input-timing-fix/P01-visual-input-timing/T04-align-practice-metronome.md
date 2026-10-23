# Task: T04 Align Practice Metronome

## Status: done

## Goal

Give pattern practice a steady audible and visual beat after its existing four-beat count-in, with clicks, note motion, and judgement driven by the same 155 BPM `office-day-01` audio clock; leave normal gameplay's current note-triggered audio unchanged.

## Decision Summary

- The live chart is `office-day-01.json` at 155 BPM. Practice extracts a region from this chart and starts its audio clock at local position zero.
- `OfficeSoundScheduler` currently accents chart events but has no fixed metronome. Its tick/lookahead scheduler and shared `AudioContext` are the correct place to schedule precise beat clicks without wall-clock drift.

## Implementation

### I01. Add opt-in beat clicks to the shared audio scheduler

- Related Files:
  - `src/game/audio/OfficeSoundScheduler.ts` :: `OfficeSoundScheduler.load`, `setMetronomeEnabled`, `tick` — schedule optional beat clicks against `AudioClock` position; modify
  - `src/game/audio/OfficeSoundScheduler.test.ts` :: `OfficeSoundScheduler` metronome cases — verify exact opt-in, beat spacing, accent, and mute behavior; modify

#### Details

- Add `setMetronomeEnabled(enabled: boolean): void` and keep the default `false`; existing normal game construction must therefore retain only its current event-triggered sounds.
- Add private `metronomeEnabled` and `nextMetronomeBeatIndex` fields. Reset the beat index to zero in `load` and `stop`.
- Compute `beatDurationMs = 60_000 / beatmap.bpm` from the loaded beatmap. Do not hardcode 155 in the shared scheduler.
- In `tick`, calculate `songPositionMs` and `horizonMs` as now. When enabled and unmuted with `sfxVolume > 0`, schedule each beat whose `beatIndex * beatDurationMs <= horizonMs` at:
  `when = context.currentTime + max(0, (beatIndex * beatDurationMs - songPositionMs) / 1000)`.
- Reuse `createBeatAccent` for the click. Accent beat index `0 mod 4` with the stronger count-in volume; other beats use the regular beat volume. Track created nodes in `activeNodes` and remove them on `ended`, matching existing scheduled-node lifecycle.
- Advance `nextMetronomeBeatIndex` even when muted or late so re-enabling audio does not produce a burst of stale clicks. Do not emit missed past beats after tab suspension; schedule only beat times not earlier than the current audio-clock position.
- `setMetronomeEnabled(true)` begins from the next loop beat position when called during playback; for practice, it is called immediately after `load` and before the existing count-in.
- Add unit coverage showing default-off behavior, one click on each crossed beat under a deterministic fake clock/lookahead, stronger downbeat, no generated audio while muted or with zero SFX volume, and no behavior change for normal scheduler usage.

### I02. Enable metronome only for codex practice and expose beat position

- Related Files:
  - `src/game/practice/PracticeRunController.ts` :: `PracticeAudioScheduler`, `PracticeRunSnapshot`, `prepareAudio`, `update`, `createSnapshot` — opt in and expose current 4/4 beat; modify
  - `src/game/practice/PracticeRunController.test.ts` :: count-in/metronome/snapshot tests — verify practice-only activation and chart-clock progression; modify
  - `src/components/practice/PatternCodex.tsx` :: pattern start action — read saved `AudioSettings` when opening practice and pass them down; modify
  - `src/components/practice/PracticeViewport.tsx` :: `PracticeViewportProps` — accept `AudioSettings` and pass them into the controller; modify
  - `src/client/settings/settingsStore.ts` :: `settingsStore.load` — existing persisted audio settings source; read-only
  - `src/components/practice/PracticeViewport.tsx` :: `PracticeViewport` — render an accessible four-beat indicator synchronized to snapshot; modify
  - `src/app/globals.css` :: `.practice-beat-indicator` and child beat styles — render downbeat and active beat states with reduced-motion support; modify
  - `e2e/pattern-codex.spec.ts` :: active practice beat-guide scenario — verify the beat guide appears after count-in; modify

#### Details

- Extend the `PracticeAudioScheduler` pick with `setMetronomeEnabled`. In `prepareAudio`, call `scheduler.load(...)`, then enable metronome before the count-in. Never enable it from the normal `PhaserCanvas` gameplay path.
- Extend the `PracticeViewport` props with required `audioSettings: AudioSettings`; construct `PracticeRunController(chart, onComplete, { audioSettings })` so chart music, metronome SFX, and the existing judgement offset use the saved snapshot.
- In `PatternCodex`, read `settingsStore.load()` only in the selected pattern's “연습 시작” click handler (never during SSR/render) and pass the resulting value to `PracticeViewport`. If localStorage cannot be read, catch the storage error and pass a fresh copy of `DEFAULT_AUDIO_SETTINGS` so practice remains available.
- Apply `muted` and `sfxVolume` from the saved settings to metronome clicks through the existing scheduler. `muted === true` or `sfxVolume === 0` silences clicks while visual beat display and judgement continue. The same settings snapshot also keeps the current practice music-volume and input-offset behavior consistent with `/game`.
- Add `beatIndex: number` (1–4) and `beatProgress: number` (0 inclusive to 1 exclusive) to `PracticeRunSnapshot`. During playing derive both from `songPositionMs` and `60_000 / chart.beatmap.bpm`; do not use `Date.now`, `performance.now`, or a free-running CSS timer for phase.
- During count-in, continue exposing `countInBeat` and retain the existing four-click sequence. On pause, freeze displayed practice beat at the frozen audio-clock position; on resume, continue from it. On each loop restart, beat position returns to beat 1 from local clock position zero.
- Keep the visual indicator active even if audio initialization fails or the user has muted SFX; audio failure/mute must not block timing practice.
- Render four labeled beat marks (`1`–`4`) near the lane, mark `1` as the measure downbeat, and set `aria-current="step"` (or an equivalent accessible current marker) on the active beat. Use `beatProgress` for a subtle within-beat fill only; the active beat must remain understandable without color or motion.
- The existing audio clock is monotonic and the backing track region starts at `sourceAudioStartMs`, while practice chart time starts at zero. Keep note motion and judgement on the local audio-clock position; the scheduler's loop region maps local zero to the source audio offset.
- Unit tests with the existing injected fake clock advance the practice position by `beatDurationMs` and assert beat index changes 1→2→3→4→1, pause freezes it, resume continues, and the scheduler receives `setMetronomeEnabled(true)` only from the practice controller.
- Add a controller test passing `{ ...settings, muted: true, sfxVolume: 0 }` and assert scheduler `load` receives those values; add a normal-settings case confirming `sfxVolume` is forwarded unchanged. The scheduler tests prove mute/zero volume create no click oscillator.
- E2E waits through count-in, verifies the four accessible beat marks, sends Space, and confirms the visual beat guide remains available. Avoid asserting real audio oscillator timing in browser E2E; scheduler unit tests cover deterministic click scheduling.

## Acceptance Criteria

- [x] Pattern practice plays four count-in clicks, then one metronome click per 155 BPM beat with a stronger measure downbeat.
- [x] The visual 1–4 beat indicator follows the same audio clock as note motion and judgement, including pause/resume and loop restart.
- [x] Muting/unavailable audio does not hide the visual guide or stop practice.
- [x] Saved SFX volume and mute settings control metronome audio; visual timing remains active when muted.
- [x] Normal gameplay remains metronome-off and retains its current event-triggered sounds.

## Validation

- `npm run typecheck` — TypeScript passes.
- `npm run lint` — ESLint passes.
- `npm test -- src/game/audio/OfficeSoundScheduler.test.ts src/game/practice/PracticeRunController.test.ts --run` — scheduler timing/mute and practice clock tests pass.
- `npm run test:e2e -- --project=chromium e2e/pattern-codex.spec.ts` — practice beat-guide behavior passes.

## Commit Message

```text
feat(practice): add audio-clock metronome and beat guide

Plan: 2026-10-22-rhythm-game-visual-input-timing-fix
Phase: P01-visual-input-timing
Task: T04-align-practice-metronome

- Schedule opt-in beat clicks against the audio clock
- Show the matching four-beat practice guide
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- Validation: `npm run typecheck`, `npm run lint`, scheduler/controller unit tests (18 passed), and `e2e/pattern-codex.spec.ts` (12 passed).
- commit: pending

