# Plan: Game Start Polish

## Goal
Make saved-session selection a centered, accessible dialog and add a clear three-second visual/audio count-in before gameplay begins. New and continued runs use `3`, `2`, `1` at one-second intervals, then `GO`; input and the beatmap clock start only after the count-in. Count-in audio follows the saved SFX volume and mute settings.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | Center saved-session choices and add the game-start count-in. | [P01](../phases/2026-10-23-game-start-polish/P01-game-start-experience/phase.md) |

## Decisions
- Saved-session choice is explicit; neither continue nor discard happens automatically.
- Center the saved-session choice dialog over the game stage on both home-start and direct game entry.
- Count down for new and continued runs, but do not add count-in to pause/resume.
- Use one second per `3`, `2`, and `1`, followed by a brief `GO` cue.
- Reuse existing SFX volume/mute settings and count-in beat sound behavior.

## Supersedes
This plan implements the confirmed saved-session modal and count-in decisions in [Direct Gameplay Start from Home](./2026-10-23-direct-gameplay-start.md). The earlier completed tutorial-gate work remains historical.
