# Plan: Rhythm Game Layout Correction

## Goal
Correct the `/game` page so its 1280 x 720 Phaser viewport keeps its 16:9 proportions and uses the largest size available below the application navigation and compact game toolbar. Use scenic arrival art to fill surrounding space, and keep page controls outside the gameplay viewport.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `complete` | Fit the gameplay view without distortion, compact page chrome, and move audio controls outside the canvas. | [P01](../phases/2026-10-22-rhythm-game-layout-correction/P01-gameplay-viewport-fit/phase.md) |

## Confirmed Constraints
- Preserve `GAME_VIEWPORT` at 1280 x 720 and Phaser `Scale.FIT`; never stretch gameplay to fill an incompatible viewport shape.
- Scale the gameplay viewport to the largest size that fits its available area.
- Fill space around it with `/game/art/background/arrival.png` using a cover/crop treatment.
- Keep the title, scene metadata, and control hints in a compact top bar or safe areas; no page overlay may cover the Phaser HUD, characters, notes, or play lane.
- Open audio settings outside the game canvas.
- Preserve authentication, gameplay/session behavior, touch controls, pause/results, audio preference behavior, and the landing page.

## Scope Note
The game scene is 1280 x 720 and `PhaserGame.ts` already configures `Phaser.Scale.FIT`. The distortion comes from the `/game` CSS sizing chain: `.game-page .game-frame` resets the aspect ratio and grows to fill the page, while `.game-frame--stage` and the canvas are forced to the same full bounds. `PhaserCanvas` currently renders `AudioSettingsPanel` inside this stage, where its expanded body covers the Fever HUD. Correct the outer viewport sizing and render the existing settings panel into a dedicated top-bar host.
