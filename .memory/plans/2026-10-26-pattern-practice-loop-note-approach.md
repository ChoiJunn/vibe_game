# Plan: Pattern Practice Loop Note Approach

## Goal
Ensure the first note of a Pattern Codex practice loop is visible approaching from the right after every restart, while keeping chart events synchronized with the bundled music. Use a source-bounded lead-in of up to 1.5 seconds: Pattern 001 has 968 ms available; patterns with at least 1.5 seconds of earlier source audio get the full 1.5 seconds. Keep the existing four-beat count-in and do not add a wait after it.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | Preserve source timing and provide a visible approach interval on practice loop starts and restarts | [P01](../phases/2026-10-26-pattern-practice-loop-note-approach/P01-source-synced-preroll/phase.md) |
