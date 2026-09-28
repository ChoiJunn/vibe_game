# Task: T01 Group and Localize the Pattern Library

## Status: pending

## Goal

Expose the 45 authored beatmap phrases as five meaningful Korean rhythm-kind groups while preserving each original phrase as an individually selectable variation. The UI must receive stable kind names, plain-language descriptions, and time-ordered variation metadata; no authored phrase or event may be deleted or merged in storage.

## Decision Summary

- Follow decision D02/D03: group by `PatternKind`, retain all unique source `BeatmapPattern.id` values, and localize kinds as 정박, 엇박, 박자 전환, 길게 누르기, 쉼표, 빠른 연타.
- Current beatmap counts are straight 17, offbeat 13, transition 4, hold 5, burst 6, rest 0. Empty kinds must not produce a selectable group.

## Implementation

### I01. Stable localized kind metadata and grouping helpers

- Related Files:
  - `src/content/beatmaps/patternLibrary.ts` :: `PatternSummary`, `getPatternLibrary`, `findPattern`; modify
  - `src/content/beatmaps/patternLibrary.test.ts` :: kind labels, group ordering, preserved-variation regression tests; new
  - `src/domain/rhythm.ts` :: `PatternKind`, `BeatmapPattern`; read-only
  - `src/content/beatmaps/office-day-01.json` :: authored source counts and IDs; read-only

#### Details

- Export a typed presentation map with one entry for every `PatternKind`:
  ```typescript
  export type PatternKindPresentation = {
    kind: PatternKind;
    label: string;
    description: string;
  };
  export const PATTERN_KIND_PRESENTATION: Record<PatternKind, PatternKindPresentation>;
  ```
- Use these Korean labels and descriptions:
  - `straight`: `정박` — “일정한 박 위에 맞춰 누르는 기본 리듬”
  - `offbeat`: `엇박` — “박 사이의 빈틈에 들어가는 리듬”
  - `transition`: `박자 전환` — “정박에서 엇박 등 다른 흐름으로 바뀌는 리듬”
  - `hold`: `길게 누르기` — “시작 박에 누르고 끝 박까지 유지하는 리듬”
  - `rest`: `쉼표` — “표시된 쉬는 구간에는 누르지 않는 리듬”
  - `burst`: `빠른 연타` — “정해진 시간 안에 여러 번 눌렀다 떼는 리듬”
- Add a stable canonical kind order `straight`, `offbeat`, `transition`, `hold`, `rest`, `burst`; `groupPatternsByKind(beatmap)` returns only non-empty groups in that order.
- Group shape:
  ```typescript
  export type PatternGroup = PatternKindPresentation & {
    variations: PatternSummary[];
  };
  export function groupPatternsByKind(beatmap: Beatmap): PatternGroup[];
  ```
- Keep `getPatternLibrary(beatmap)` one-to-one with `beatmap.patterns`. Resolve event IDs as today, derive the section from the first resolved event, and sort each group's variations by `startMs` then stable `id`.
- Do not deduplicate equal labels: two source phrases with the same kind and section remain distinct variations. Do not silently convert missing event references into invented notes; keep `eventCount` based only on found source events, and do not return a selectable group entry with zero resolved events.

### I02. Library invariants and test coverage

- Test exact Korean label/description mapping for all six kinds.
- Test that the current beatmap yields group counts `straight:17`, `offbeat:13`, `transition:4`, `hold:5`, `burst:6`; `rest` is absent because it has no variations.
- Flattened group variation IDs must equal the set of all 45 source pattern IDs, each exactly once; each variation retains its original event IDs and four resolved events.
- Test stable order for variations within a group and for groups with a synthetic rest entry.
- Test that two same-label/same-section phrases remain separate and retain unique IDs.

## Acceptance Criteria

- [ ] The library contains one non-empty group per currently populated kind with Korean name and useful Korean explanation.
- [ ] All 45 current source patterns and their original event membership remain selectable exactly once.
- [ ] No empty `rest` group is shown, but adding a rest source phrase makes it appear in canonical order.
- [ ] Existing callers of `getPatternLibrary` and `findPattern` remain type-safe or are migrated in the same task.

## Validation

- `npm run test -- --run src/content/beatmaps/patternLibrary.test.ts src/domain/rhythm.test.ts`
- `npm run typecheck`
- `npx eslint src/content/beatmaps/patternLibrary.ts src/content/beatmaps/patternLibrary.test.ts`

## Commit Message

```text
feat(practice): group and localize rhythm patterns

Plan: 2026-09-28-pattern-codex-practice
Phase: P01-pattern-codex-practice
Task: T01-group-and-localize-pattern-library

- Add Korean pattern-kind descriptions and canonical ordering
- Preserve each authored phrase as a distinct grouped variation
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (8 tests, typecheck, ESLint)
- commit: `feat(practice): group and localize rhythm patterns`
