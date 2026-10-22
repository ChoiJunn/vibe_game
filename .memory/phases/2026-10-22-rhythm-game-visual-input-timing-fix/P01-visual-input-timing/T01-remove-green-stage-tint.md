# Task: T01 Remove Green Stage Tint

## Status: done

## Goal

Remove the green-tinted glow and blurred duplicate backdrop seen on the start and game-entry screens, keeping the original illustrated stage visible and using neutral charcoal where text requires contrast.

## Decision Summary

- Do not recolor or remove natural green objects inside the artwork, nor alter mint judgement/status accents unrelated to backgrounds.
- The home preview and game-entry stage share `RhythmStagePreview`; the outer game-stage shell separately paints a blurred copy of the arrival art behind its canvas.

## Implementation

### I01. Neutralize preview and game-stage background treatments

- Related Files:
  - `src/components/game/RhythmStagePreview.tsx` :: `RhythmStagePreview` — remove the decorative mint glow layer while retaining image, neutral shade, character, mascot, notes, and lane; modify
  - `src/app/globals.css` :: `.rhythm-preview__light--mint`, `.landing-stage__vignette`, `.game-stage-shell::before` — eliminate mint backdrop glow and green cast; make text vignette neutral charcoal; remove the blurred duplicate art behind the actual game canvas; modify

#### Details

- Keep `/game/art/background/arrival.png` rendered by `.rhythm-preview__background` and by the Phaser `OfficeBackground` scene. Preserve character and mascot images and all gameplay canvas assets.
- Remove the `rhythm-preview__light--mint` decorative element from `RhythmStagePreview.tsx`; remove its now-unused CSS selector. Do not remove `.rhythm-preview__light--coral`, mint note accents, `--mint` tokens, success states, or judgement colors.
- Change `.landing-stage__vignette` and its `max-width: 560px` override to neutral charcoal values (neutral RGB channels, with no green/mint component). Keep enough darkening behind white landing copy to preserve contrast.
- Remove the image, blur, and brightness filter from `.game-stage-shell::before`; let the existing neutral `#263238` shell background show around the contained game frame. Do not add another blurred copy of the illustration.
- Keep the actual artwork's brightness/saturation as currently defined on `.rhythm-preview__background`; do not apply a green color filter to the image.

### I02. Verify both entry surfaces

- Related Files:
  - `e2e/auth-shell.spec.ts` :: `home intro fills desktop and mobile viewports with visible animated art` — assert the mint glow is absent and the background image, character, and lane still render; modify
  - `e2e/game-entry.spec.ts` :: `game preview is visible while active-session discovery is still pending` — assert the game shell has a neutral backing and preview artwork remains visible; modify

#### Details

- In home E2E at 1920×900 and 390×844, assert `.rhythm-preview__light--mint` count is zero, `.rhythm-preview__background` has a loaded natural width, and `.rhythm-preview__lane` and character remain visible.
- In `/game` entry E2E, retain existing delayed-session behavior assertions and assert computed `background-image` for `.game-stage-shell::before` is `none` (or pseudo content is absent) while `.game-play-surface__preview` remains visible.
- Do not assert pixel screenshots against a particular browser's color rendering; assert removed layer and retained assets.

## Acceptance Criteria

- [x] Home and game-entry surfaces have no mint glow or blurred green-tinted duplicate background layer.
- [x] The stage image, character, mascot, lane, and readable text remain present at desktop and mobile sizes.
- [x] Natural greens and non-background mint judgement/status accents remain unchanged.

## Validation

- `npm run typecheck` — TypeScript passes.
- `npm run lint` — ESLint passes.
- `npm run test:e2e -- --project=chromium e2e/auth-shell.spec.ts e2e/game-entry.spec.ts` — home and game-entry visual assertions pass.

## Commit Message

```text
fix(ui): remove green cast from stage backdrops

Plan: 2026-10-22-rhythm-game-visual-input-timing-fix
Phase: P01-visual-input-timing
Task: T01-remove-green-stage-tint

- Remove mint glow and blurred duplicate stage art
- Preserve illustrated assets and text contrast
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (`npm run typecheck`, `npm run lint`, targeted Chromium E2E: 9 passed)
- commit: 1bab0dc

\n
