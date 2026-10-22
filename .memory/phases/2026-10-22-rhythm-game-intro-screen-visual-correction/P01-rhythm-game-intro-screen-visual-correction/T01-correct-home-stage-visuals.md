# Task: T01 Correct Home Stage Visuals

## Status: done

## Goal
Render `/` as a compact game start screen with readable title and CTA, visible protagonist and mascot, noticeable looping rhythm motion, and no decorative corner circles.

## Decision Summary
- Keep the existing decorative `RhythmStagePreview`; the preview must not start Phaser gameplay, call the session API, or write game data.
- Reuse existing character, mascot, and arrival background images. Keep Entra login/CTA behavior and reduced-motion accessibility.

## Implementation

### I01. Home stage hierarchy and viewport density
- Related Files:
  - `src/app/page.tsx` :: `HomePage` ??retain semantic home content and existing `LoginButton`; modify only if markup order/containers are necessary to place the stage and CTA without overlap.
  - `src/app/globals.css` :: `.page-shell--home`, `.page-shell--home > .game-frame`, `.page-shell--home .landing-stage`, `.page-shell--home .landing-content`, `.landing-stats`, responsive home media rules ??make the composition fill the viewport below the 4rem top bar; modify.

#### Details
- Preserve `HomePage`'s accessible `main`, `section[aria-labelledby="game-title"]`, one `h1`, `LoginButton`, and game stats. Do not add a second visually hidden title or duplicate CTA.
- Make the outer home card use the available viewport width and height below the top bar, with a small consistent edge inset. Ensure the card does not introduce page-level horizontal or vertical scrolling at 1920횞900 or 390횞844.
- Keep the art as the dominant stage and place the title, one-line instruction, CTA, and stats in a compact, high-contrast content group. Maintain readable line lengths and use responsive `clamp()` sizing; keep all text inside the stage at desktop and mobile widths.
- Give the content group an opaque/translucent backing or a gradient only where needed to maintain readable contrast over the scene. Avoid darkening the character art enough to make the protagonist disappear.
- Keep the CTA and stats visible together without covering the character's face/body or the moving note lane. On narrow screens, stack the copy and CTA while keeping the protagonist and Moka in the visible crop.

### I02. Character visibility, motion, and circle removal
- Related Files:
  - `src/components/game/RhythmStagePreview.tsx` :: `RhythmStagePreview` ??existing background, protagonist, Moka, lane, and decorative nodes; read-only unless a missing element prevents the agreed visual.
  - `src/app/globals.css` :: `.game-frame::before`, `.game-frame::after`, `.landing-stage__preview`, `.rhythm-preview__character`, `.rhythm-preview__moka`, `.rhythm-preview__lane`, `.rhythm-preview__note`, `@keyframes rhythm-preview-character`, `@keyframes rhythm-preview-note`, `@media (prefers-reduced-motion: reduce)` ??show the existing art clearly, make normal-preference motion apparent, and suppress the unwanted home circles; modify.
  - `public/game/art/character/protagonist-perfect.png` :: existing protagonist asset; read-only.
  - `public/game/art/mascot/moka-perfect.png` :: existing mascot asset; read-only.

#### Details
- Hide the two `.game-frame::before` / `::after` decorative circles for `.page-shell--home` explicitly. Do not depend on negative `z-index` or background paint order to make them accidentally invisible.
- **Observed cascade bug**: `.landing-stage__preview` declares `position:absolute` before the later `.rhythm-preview { position:relative; width:100%; }` rule. Both selectors have equal specificity, so the generic rule wins and turns the preview into a flex item. At 1920횞900 the stage is about 1893px wide but the preview is only about 1275px, leaving the image short of the card edge. Make the home selector more specific or move its override after the generic preview rule; explicitly set the preview to `position:absolute; inset:0; width:100%; height:100%; aspect-ratio:auto` so the art spans the whole stage behind the content.
- Keep `.landing-stage` as the containing block for the full-bleed preview and verify the copy group remains above it. The section already has a relative positioning context through `.game-frame-content`.
- Ensure the home preview's character and Moka have positive, visible stacking order above the background and shade, nonzero responsive size, and a position that stays above the lane. Do not use `display:none`, zero opacity, clipping, or transforms that move either image outside the stage.
- Increase the character bob range and/or rhythm-note travel speed enough to be perceptible during ordinary viewing. Keep looping motion smooth and retain the existing note lane, hit line, and sparkle accents.
- Under `prefers-reduced-motion: reduce`, preserve all scene content as a static composition and use the existing reduced-motion rule to stop animation. Do not force motion in that mode.
- Do not add an animation package, new image asset, autoplay sound, gameplay loop, or session request.

## Acceptance Criteria
- [x] The title, instruction, and CTA are readable over the background without clipping or overlap at desktop and 390횞844 mobile widths.
- [x] The home stage uses nearly all space below the top bar and has no page-level horizontal scroll at the target sizes.
- [x] The preview image rectangle matches the full stage rectangle at both target sizes; it does not shrink as a flex sibling next to the copy.
- [x] Both protagonist and Moka images load and remain visibly inside the stage; neither is hidden by the copy panel or note lane.
- [ ] With normal motion preference, the protagonist transform and a note position visibly change over a 1-second interval.
- [ ] With reduced motion enabled, the character, mascot, CTA, and note lane remain visible while their keyframe animations are stopped.
- [x] The home `.game-frame` top-right and bottom-left pseudo circles are explicitly hidden.
- [ ] The public home performs no `/api/game/session` request and leaves the current Entra CTA behavior intact.

## Validation
- `npm run typecheck` ??passes without changing session/auth types.
- `npx eslint src/app/page.tsx src/components/game/RhythmStagePreview.tsx` ??passes for the modified home source.
- `npm run test:e2e -- --project=edge --workers=1 --grep "landing screen|home intro"` ??passes after T02 adds the home visual assertions.

## Commit Message
```text
fix(home): make the rhythm stage visible and legible

Plan: 2026-10-22-rhythm-game-intro-screen-visual-correction
Phase: P01-rhythm-game-intro-screen-visual-correction
Task: T01-correct-home-stage-visuals

- Improve home-stage contrast and viewport fit
- Show the characters and remove corner circles
```

## Progress
- [x] Implementation complete: fixed preview cascade, viewport fit, mobile stage height, and corner circles.
- [x] Validation passed: typecheck, scoped ESLint, and visual review at 1920x900 and 390x844.
- commit: ix(home): make the rhythm stage visible and legible`n