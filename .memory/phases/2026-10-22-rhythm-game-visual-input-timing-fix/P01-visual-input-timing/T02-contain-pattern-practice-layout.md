# Task: T02 Contain Pattern Practice Layout

## Status: done

## Goal

Keep pattern catalog and practice content in a centered, width-limited column so the practice heading, moving-note lane, feedback, statistics, and controls are fully visible without horizontal overflow on desktop and mobile.

## Decision Summary

- `.pattern-codex` already caps catalog width at 1180px, but `PatternCodex` returns `PracticeViewport` outside that wrapper when practice opens.
- Reuse the existing catalog width boundary and stack practice controls at narrow widths; do not scale the lane beyond its container.

## Implementation

### I01. Place active practice inside the centered content wrapper

- Related Files:
  - `src/components/practice/PatternCodex.tsx` :: `PatternCodex` practice-open branch — wrap the active `PracticeViewport` with the same centered content boundary used by the catalog; modify
  - `src/app/globals.css` :: `.practice-page`, `.pattern-codex`, `.practice-viewport`, `.practice-viewport__heading`, `.practice-viewport__lane`, `.practice-viewport__actions`, responsive media queries — constrain width, allow children to shrink, and prevent clipping; modify

#### Details

- In `PatternCodex`, when `practiceOpen && selectedPracticeChart`, render a wrapper with the existing `.pattern-codex` class around `PracticeViewport`; retain the warning text and its `role="status"`.
- Keep the wrapper max-width at 1180px, centered with automatic side margins, and set `width: 100%` / `min-width: 0` so grid and flex children may shrink within it.
- Set active `.practice-viewport` width to 100%, `min-width: 0`, and responsive padding using `clamp`; retain `.practice-viewport--summary`'s narrower result-summary width.
- Give the practice heading's text column `min-width: 0` and allow long titles to wrap; keep the loop badge from shrinking.
- Keep the lane width bounded by the panel, use `min-width: 0`, and preserve `overflow: hidden` only inside the lane to clip notes outside the play area, not the panel or page.
- At <=700px, stack the variation preview and start action in one column. At <=560px, stack active practice heading/actions as needed; all pause/exit controls remain visible and have at least 44px hit height.
- Avoid setting a fixed height on the practice page or active panel; the document may scroll vertically to reveal content.

### I02. Verify content bounds at desktop and mobile sizes

- Related Files:
  - `e2e/pattern-codex.spec.ts` :: `keeps variation previews and actions within a narrow mobile viewport` and a new active-practice bounds test — assert panel containment and no horizontal overflow; modify

#### Details

- Extend the existing 390×844 viewport scenario to inspect `.practice-viewport` after starting a pattern and confirm its left/right bounds are within `window.innerWidth`.
- Add a desktop scenario at 1440×900 that starts a pattern and checks `.practice-viewport` width is <=1180px and centered, with heading, loop badge, lane, and action buttons inside its bounding rectangle.
- At both sizes assert `document.documentElement.scrollWidth <= window.innerWidth`; vertical scrolling is allowed.
- Retain all existing catalog counts, progression, and practice-record assertions.

## Acceptance Criteria

- [x] The catalog and practice views share a centered max-width boundary on desktop.
- [x] At 390px viewport width, no horizontal overflow or clipped title, lane, or action button exists.
- [x] The practice panel can grow vertically and keeps all controls reachable.

## Validation

- `npm run typecheck` — TypeScript passes.
- `npm run lint` — ESLint passes.
- `npm run test:e2e -- --project=chromium e2e/pattern-codex.spec.ts` — existing catalog/practice flow and new bounds assertions pass.

## Commit Message

```text
fix(practice): contain pattern practice layout

Plan: 2026-10-22-rhythm-game-visual-input-timing-fix
Phase: P01-visual-input-timing
Task: T02-contain-pattern-practice-layout

- Center the catalog and active practice panel
- Verify desktop and mobile content bounds
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- Validation: `npm run typecheck`, `npm run lint`, and `e2e/pattern-codex.spec.ts` (11 passed).
- commit: pending

