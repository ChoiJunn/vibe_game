# Plan: Pattern Codex and Rhythm Practice

## Goal

Make the pattern catalog understandable and make practice behave like a real rhythm trainer. Group repeated-looking phrases into Korean rhythm-kind cards while retaining every authored variation; let players preview and select variations; use the game's actual timing rules and corresponding soundtrack segment; loop without interruption until exit; support touch input in practice and the main game; and preserve per-variation local progress and an exit summary.

## Decision Source

- [Confirmed decisions](../decisions/2026-09-28-pattern-codex-practice.md)
- Keep all authored beatmap patterns; grouping is a presentation change, not beatmap deletion or deduplication of event data.
- Judgement must use the same rules as the main game (`PERFECT` ±80 ms, `GOOD` ±160 ms, and existing tap/hold/burst semantics).
- Touch controls must emit real down/up events through the shared judgement path; they must never directly award a judgement.
- Practice misses do not consume hearts or stop practice. A partial loop is not a completed attempt.
- Keep progress local and user-specific; do not add result/leaderboard writes or authentication-token storage.

## Repository Findings

- Repository: `C:\바이브교육\vibe_game`
- Decision source: `.memory/decisions/2026-09-28-pattern-codex-practice.md`.
- The beatmap currently has 45 four-event pattern variations: straight 17, offbeat 13, transition 4, hold 5, burst 6, rest 0. Do not show an empty rest card until data exists.
- `src/content/beatmaps/patternLibrary.ts` currently maps each authored pattern separately and returns its English label/kind without descriptions or grouping.
- `src/components/practice/PatternCodex.tsx` renders repeated cards, filters by English kind, and creates a fresh practice beatmap on render. Its `onComplete` callback changes when codex state changes.
- `src/game/practice/PracticeRunController.ts` currently treats every registered input as a caller-supplied judgement, advances without a clock, and has no real miss/timing behavior. `PracticeViewport.tsx` calls it `perfect` for any Space keydown or button click.
- The main game uses `RhythmGameController`, `judgeTap`/`judgeHoldStart`/`judgeHoldEnd`/`judgeBurst`, `JUDGEMENT_WINDOWS` (`perfectMs: 80`, `goodMs: 160`), `AudioClock`, and `OfficeSoundScheduler`. Its input adapter `SpaceInputController` currently handles keyboard Space only.
- `MusicTrackPlayer` loads `/game/audio/office-groove.wav`; `OfficeSoundScheduler` currently starts that whole track at the current song position and has no source-segment loop bounds.
- `src/client/game/patternCodexStore.ts` already stores per-pattern attempts, successes, best accuracy, mastery, and badges in user-keyed localStorage. `recordPatternPractice` is called only after a practice run completes.
- Relevant existing tests: `src/game/practice/PracticeRunController.test.ts`, `src/client/game/patternCodexStore.test.ts`, `src/game/input/SpaceInputController.test.ts`, game judgement/controller tests, and `e2e/gameplay.spec.ts` / `e2e/release-critical-path.spec.ts`.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 도감 분류와 미리보기를 이해하기 쉽게 만들고, 실제 판정·음악·터치 입력이 있는 무중단 반복 연습을 완성 | [P01](../phases/2026-09-28-pattern-codex-practice/P01-pattern-codex-practice/phase.md) |

## Execution Order

Run tasks in order because the catalog presentation consumes T01 grouping metadata; the real practice runtime consumes the selected variation; touch input connects to both the gameplay and practice input paths; and T05 verifies/persists the complete user flow.

## Scope and Constraints

- One phase only. Split the work into tasks, not additional phases.
- No beatmap event edits, scoring-policy changes, server/Cosmos schema changes, result submission, leaderboard writes, deployment, or character-art work.
- Preserve the main game's current failure-on-zero-hearts behavior. Any practice-only continue-after-zero policy must default off and have regression tests proving normal gameplay is unchanged.
- Only completed practice loops update per-variation progress. Exiting mid-loop discards that incomplete loop from attempt counts and summary totals.
- If localStorage is blocked or quota-limited, the practice session and exit flow continue; show a recoverable progress-save warning rather than crashing.
- Use existing source `office-groove.wav`; do not generate or replace music assets. A short initial four-beat count-in is the implementation default for the confirmed “short count-in”; do not insert a blocking dialog or a count-in between loops.
