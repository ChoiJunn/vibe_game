# Task: T01 Fit Gameplay Viewport and Toolbar

## Status: done

## Goal
Render the `/game` play area at the largest 16:9 size that fits below the application navigation and a compact page toolbar, without stretching the Phaser canvas. Fill the space around the contained play area with the existing arrival-scene art. Keep page information and audio controls outside the game canvas.

## Decision Summary
- `GAME_VIEWPORT` is 1280 x 720 and Phaser already uses `Phaser.Scale.FIT`; retain both and correct the DOM/CSS constraints around the canvas.
- The user chose scenic art to fill remaining space and a compact header. Never cover the existing Phaser HUD, characters, notes, or lane with page information or audio settings.
- Current scene metadata is outside Phaser: `OFFICE MORNING MIX`, `06 SCENES / 180 BEATS`, and the tap/hold/finish legend. Put concise information in the compact toolbar where it fits; omit duplicated copy rather than overlaying the playfield.

## Implementation

### I01. Constrain and center the gameplay viewport
- Related Files:
  - `src/app/game/page.tsx` :: `GamePage` — retain the authenticated game route, make its page-level title/actions/settings host compact, and relocate scene metadata/control hints out of the stage; modify.
  - `src/app/globals.css` :: `.game-page`, `.game-page__heading`, `.game-page__intro`, `.game-page__actions`, `.game-stage-shell`, `.game-stage-shell__topline`, `.game-stage-shell__footer`, `.game-page .game-frame`, `.game-frame--stage`, `.game-play-surface`, `.phaser-canvas-shell`, responsive `@media` rules — size the stage host and centered 16:9 frame, preserve the correct aspect chain, and style scenic surroundings; modify.
  - `src/game/config.ts` :: `GAME_VIEWPORT` — read-only; retain `{ width: 1280, height: 720, aspectRatio: 16 / 9 }`.
  - `src/game/PhaserGame.ts` :: `createPhaserGame` — read-only; retain `Phaser.Scale.FIT` and `Phaser.Scale.CENTER_BOTH`.

#### Details
- Keep the page within the viewport below the existing 4rem application navigation. Use a compact header and give the remaining height to the stage host. Set the relevant flex/grid children to `min-height: 0` so the canvas can shrink proportionally instead of overflowing or being stretched.
- Center the actual `.game-frame` within the available stage area. Constrain its width and height to both the host bounds and its 16:9 ratio. It must use the largest possible dimensions that fit; on short or narrow viewports it scales down while keeping 16:9. Do not rely on `width: 100%` and `height: 100%` together for the game frame.
- Preserve the nested DOM contract from `GameViewport`: the outer `.game-frame` is the aspect-constrained frame; its `.game-frame--stage` child fills that frame; `.game-play-surface` and Phaser's canvas fill that child. `canvas { width:100%; height:100% }` is acceptable only after the outer frame is guaranteed to be 16:9.
- Apply `/game/art/background/arrival.png` as cover/cropped art behind the contained frame on `.game-stage-shell` (or a dedicated stage-host pseudo-element). Add enough darkening/blur or edge treatment to make the distinction between the contained viewport and surrounding scenic art intentional. Do not add a new image asset or dependency.
- Keep scenic fill behind the centered game frame and ensure it cannot intercept pointer or keyboard input. Keep the 16:9 scene itself completely visible and unclipped.
- Remove the separate stage topline/footer rows from the stage's height budget. Put only their concise content in the page toolbar; ensure toolbar wrapping on narrow screens does not overlap controls or the game.
- Preserve the public home page `.page-shell--home` styles and all other routes.

### I02. Place audio settings in the compact top bar
- Related Files:
  - `src/app/game/page.tsx` :: `GamePage` — add a dedicated, stable host element for game settings inside the top toolbar; modify.
  - `src/components/game/PhaserCanvas.tsx` :: `PhaserCanvas` — keep ownership of current audio settings and `changeSettings`, but portal `AudioSettingsPanel` into the top-toolbar host; modify.
  - `src/components/settings/AudioSettingsPanel.tsx` :: `AudioSettingsPanel` — read-only unless host styling requires a semantic/accessibility change; preserve slider, mute, calibration, and privacy-note behavior.
  - `src/app/globals.css` :: `.game-page__settings-host`, `.audio-settings`, `.audio-settings summary`, `.audio-settings__body`, and small-screen toolbar rules — style the settings trigger and expanded content as part of the top toolbar's document flow; modify.

#### Details
- Add one page-unique target (`id="game-audio-settings-host"`) to the game-page toolbar. In client component `PhaserCanvas`, use `useSyncExternalStore` with a null server snapshot and a DOM snapshot reader to find the stable host, then use `createPortal` from `react-dom` to render the existing `<AudioSettingsPanel value={settings} onChange={changeSettings} />` there. Keep settings state, persistence, change callback, and calibration callbacks in `PhaserCanvas` unchanged; avoid setting React state directly in an effect to discover the host.
- Render no duplicate settings panel. Keep the `<details>` element closed initially and keyboard operable. Its trigger must remain visible in the compact toolbar.
- Let the expanded settings body take normal document-flow space in the toolbar, reducing the game stage's available height while open. Do not absolutely or fixed-position the panel over the game frame. Confirm opening it cannot cover the Phaser HUD or notes.
- If the host is not yet mounted during the first client render, render no panel until the effect finds the host; do not access `document` during server rendering. If no host can be found, fail safely without throwing and leave the game canvas usable.
- Preserve the existing control contract: music volume and SFX volume sliders use `[0,1]` in `0.05` increments; mute is a boolean checkbox; input offset is `[-150,150]` ms in `5` ms increments; calibration updates the input offset; privacy note remains present.
- Keep the settings section usable at desktop and mobile widths. It must remain scrollable/reachable if its content is taller than the available toolbar area; do not clip keyboard focus.

## Acceptance Criteria
- [x] At 1920 x 860, the game frame uses the largest dimensions that fit below the application nav and compact toolbar, with exact 16:9 bounds and no canvas distortion.
- [x] At 390 x 844 and at a short desktop viewport, the game frame remains 16:9, scales down to fit, and creates no horizontal page scrolling or clipped game surface.
- [x] The surrounding stage area shows the existing scenic arrival art, while the actual game frame remains fully visible and centered.
- [x] Title, scene count, control hints, leaderboard action, and settings trigger do not overlap at desktop or mobile widths. Formerly separate stage rows no longer reduce game-frame height.
- [x] Opening audio settings expands outside the game canvas and never covers Fever HUD, score HUD, characters, notes, or rhythm lane. All current settings and calibration controls remain operable.
- [x] Existing game entry, pause/resume, result, audio persistence, authentication, touch, and home-page behavior remain unchanged.

## Validation
- `npm run typecheck` — no TypeScript errors.
- `npm run lint -- src/app/game/page.tsx src/components/game/PhaserCanvas.tsx` — no ESLint errors in changed TSX files.
- `npx playwright test e2e/gameplay.spec.ts --project=edge --workers=1` — audio settings, calibration, play, pause/resume, and audio persistence flow passes.
- Manual browser review at 1920 x 860, 1440 x 900, 390 x 844, and a short desktop height — verify frame geometry, scenic fill, toolbar/settings non-overlap, and no unintended page scroll.

## Commit Message
```text
fix(game): fit the gameplay view without stretching

Plan: 2026-10-22-rhythm-game-layout-correction
Phase: P01-gameplay-viewport-fit
Task: T01-fit-gameplay-viewport-and-toolbar

- Keep the Phaser view at its native 16:9 ratio
- Move settings and scene information outside the playfield
- Fill surrounding space with the arrival scene art
```

## Progress
- [x] Implementation complete: constrained the Phaser frame to 16:9, filled surrounding stage space with blurred arrival art, compacted page chrome, and moved audio settings into a non-overlapping toolbar host using a React portal.
- [x] Validation passed: typecheck, scoped ESLint, gameplay E2E (2/2), and browser geometry/overlap review at 1920 x 860, 1440 x 900, 390 x 844, and 1280 x 520.
- commit: recorded by memory-execute
