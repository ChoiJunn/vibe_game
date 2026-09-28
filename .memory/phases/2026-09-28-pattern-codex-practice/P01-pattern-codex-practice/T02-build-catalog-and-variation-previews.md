# Task: T02 Build the Catalog and Variation Previews

## Status: pending

## Goal

Replace the repeated English pattern cards with a navigable Korean catalog: one card per populated kind, then a variation picker that distinguishes each retained source phrase by work scene and ordinal and previews exactly where its notes occur.

## Decision Summary

- Follow D02/D03: first view is grouped by kind; choosing a kind reveals every source variation; do not collapse or remove variations.
- Use Korean work-scene names: arrival `출근길`, keyboard `키보드 업무`, mail `메일 확인`, meeting `회의`, copy `복사 업무`, departure `퇴근길`.
- The mini diagram must encode actual source event timing and type rather than decorative generic dots.

## Implementation

### I01. Category and variation navigation

- Related Files:
  - `src/components/practice/PatternCodex.tsx` :: `PatternCodex`, `PatternCard`; modify
  - `src/content/beatmaps/patternLibrary.ts` :: `PatternGroup`, localized kind metadata from T01; read-only unless a T01 interface migration requires a small adjustment
  - `src/app/globals.css` :: `.pattern-codex*`, `.pattern-card*`, responsive practice styles; modify
  - `src/app/practice/page.tsx` :: authenticated practice route; read-only

#### Details

- Replace the current flat `visible` pattern list/filter with `PatternGroup[]` from T01. The top-level filter buttons use Korean labels, retain the `전체` option, and filter groups by `kind`.
- Render one category card per visible group. Show its localized label, brief explanation, variation count, and progress slot/aggregate supplied by the codex store (T05 may fill progress fields later; never show fake READY/MASTERED state as if it were a phrase-specific result).
- Selecting a category opens an accessible variation-selection panel. Keep the selected category visible in the heading and provide a clear `종류 목록` back action.
- Number variations independently within each `(section, kind)` after start-time sorting, starting at 1. Use the format `{scene Korean label} · {kind label} {ordinal}`; show event count and duration. IDs remain the source pattern IDs; ordinals are presentation only.
- Selecting a variation opens its practice view using that exact source pattern ID. Returning from practice/session summary returns to the variation list, not an arbitrary category or fresh first page.
- Use semantic buttons with visible keyboard focus. Ensure category/variation counts and labels are available to screen readers; do not encode state through color alone.

### I02. Data-driven mini beat diagram

- Add a reusable `PatternBeatPreview` component (in `PatternCodex.tsx` or `src/components/practice/PatternBeatPreview.tsx`; choose the separate file if this keeps the catalog readable).
- Normalize event positions relative to the first pattern event and pattern duration. Render:
  - tap: one pulse marker at `startMs`;
  - hold: a bar from `startMs` through `endMs` with start/end markers;
  - burst: a distinct burst marker with `requiredPresses` ticks distributed across the authored start/end interval;
  - rest: a labeled no-input interval when such source data exists.
- Include the mini preview in each variation row/card and an accessible label describing kind, scene, ordinal, and event count. The preview is static; the actual moving practice lane is T03.
- Add CSS for narrow layouts so variations wrap without horizontal page overflow; retain a clearly visible selection/focus state.

### I03. Catalog regression coverage

- Add `e2e/pattern-codex.spec.ts` coverage for: five category cards with current data; no empty 쉼표 category; Korean filter labels; same-kind same-scene variants distinguished by ordinal; each kind's variant preview renders correct note-type markers; selecting a variation passes its original pattern ID into practice; back navigation returns to the same variation list.
- Use existing Entra E2E auth switch from `e2e/support/gameApi.ts` or `sessionStorage` bootstrap convention in current E2E specs; do not call production APIs.

## Acceptance Criteria

- [ ] No repeated flat `ARRIVAL STRAIGHT`/equivalent English-only cards remain; the top level is grouped by Korean rhythm kind.
- [ ] Every non-empty source variation is reachable from its category and has a stable, understandable Korean scene/ordinal label.
- [ ] Mini previews are computed from source event type/timing and visually distinguish tap, hold, and burst.
- [ ] Category/variation navigation works by keyboard and touch-sized controls and remains responsive on mobile widths.

## Validation

- `npx playwright test e2e/pattern-codex.spec.ts --project=chromium`
- `npm run typecheck`
- `npx eslint src/components/practice e2e/pattern-codex.spec.ts src/app/globals.css` (if ESLint does not accept CSS, lint the TypeScript/TSX paths and use `git diff --check` for CSS).

## Commit Message

```text
feat(practice): add localized grouped pattern catalog

Plan: 2026-09-28-pattern-codex-practice
Phase: P01-pattern-codex-practice
Task: T02-build-catalog-and-variation-previews

- Navigate rhythm-kind groups and distinct source variations
- Preview authored tap, hold, and burst timing before practice
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (5 Chromium E2E tests, typecheck, ESLint, diff check)
- commit: `feat(practice): add localized grouped pattern catalog`
