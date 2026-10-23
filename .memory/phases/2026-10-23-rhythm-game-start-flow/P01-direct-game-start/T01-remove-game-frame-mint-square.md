# Task: T01 Remove Game Frame Mint Square

## Status: done

## Goal

Remove the translucent mint square that appears over the top-left part of the game frame while keeping the existing white frame border intact.

## Decision Summary

- The global `.game-frame::after` is a decorative mint circle sized to 42% of the frame.
- `.game-page .game-frame::after` reuses it as a frame border but currently fails to reset the inherited mint background, opacity, width, and aspect ratio.
- On game pages, the pseudo-element must stretch to the full frame and render only its border.

## Implementation

### I01. Reset the game frame pseudo-element for border-only use

- Related Files:
  - `src/app/globals.css` :: `.game-page .game-frame::after` — override the global decorative circle properties for the game frame; modify

#### Details

- Keep the existing `content: ''`, `position: absolute`, `z-index: 10`, `inset: 0`, `border: 0.3rem solid rgba(255, 253, 248, 0.86)`, `border-radius: inherit`, `filter: none`, and `pointer-events: none` behavior.
- Add `width: auto`, `height: auto`, and `aspect-ratio: auto` so all four inset edges determine the border box size rather than retaining the global 42% square dimensions.
- Set `background: transparent` and `opacity: 1` so the inherited `background: var(--mint)` and `opacity: 0.42` cannot tint the game content.
- Do not remove the global mint decoration from other `.game-frame` instances; the home screen already disables those pseudo-elements separately.

### I02. Assert the game frame has no mint fill

- Related Files:
  - `e2e/game-entry.spec.ts` :: `game preview is visible while active-session discovery is still pending` — assert the pseudo-element is full-frame, transparent, and the preview remains visible; modify

#### Details

- Read `getComputedStyle(frame, '::after')` in the existing delayed session-discovery scenario.
- Assert computed `background-color` is transparent (`rgba(0, 0, 0, 0)`), computed opacity is `1`, and the pseudo-element bounding dimensions match the `.game-frame` dimensions within one CSS pixel.
- Keep existing game preview/session discovery assertions.

## Acceptance Criteria

- [x] The game frame no longer displays a mint-filled rectangle.
- [x] The white game frame border still spans all four sides of the frame.
- [x] The stage preview and session discovery behavior remain visible and unchanged.

## Validation

- `npm run typecheck` — TypeScript passes.
- `npm run lint` — ESLint passes.
- `npm run test:e2e -- --project=chromium --workers=1 e2e/game-entry.spec.ts` — game-entry assertions pass.

## Commit Message

```text
fix(ui): remove mint square from game frame

Plan: 2026-10-23-rhythm-game-start-flow
Phase: P01-direct-game-start
Task: T01-remove-game-frame-mint-square

- Reset inherited frame decoration styles
- Keep the border and preview visible
```

## Progress

- [x] Implementation complete
- [x] Validation passed (`npm run typecheck`, `npm run lint`, 5 game-entry E2E tests)
- commit: d81d2f1
