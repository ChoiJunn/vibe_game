# Decisions: Rhythm Game Layout Correction

- Date: 2026-10-22
- Status: Confirmed
- Scope: Correct the `/game` gameplay page sizing and surrounding UI layout. Do not redesign the landing page or change gameplay rules.

## D01. Gameplay viewport sizing
- **Chosen**: Preserve the Phaser game's 16:9 aspect ratio and scale it to the largest size that fits the available viewport. Never stretch the game canvas to fill an incompatible aspect ratio.
- **Rationale**: The current 1280×720 game scene is designed for 16:9, and stretching its canvas makes the characters and playfield look distorted. The user wants the gameplay area larger with as little unused space as possible.

## D02. Remaining viewport space
- **Chosen**: Fill space around the contained 16:9 viewport with the game's scenic background, using a cover/crop treatment that keeps the game canvas undistorted.
- **Rationale**: The user selected a scenic fill for space that cannot be occupied by the 16:9 canvas.

## D03. Page chrome and gameplay safe areas
- **Chosen**: Compact the title and page controls into a slim top bar. Keep scene metadata and control hints in areas that do not cover the Phaser HUD, characters, notes, or play lane; when no safe overlay area exists, place the information in the top bar.
- **Rationale**: The user selected a compact header and requested that overlays not obscure other elements. Existing in-game HUD occupies the upper corners and rhythm lane occupies the lower part of the scene.

## D04. Audio settings
- **Chosen**: Open audio settings from the top bar outside the game canvas so the panel never covers gameplay.
- **Rationale**: The user selected an outside-canvas settings panel to avoid covering the fever HUD and other game elements.

## Codebase facts and implementation constraints
- `GAME_VIEWPORT` is 1280 x 720 (16:9), and Phaser uses `Phaser.Scale.FIT`.
- `.game-page .game-frame` currently resets the aspect ratio and forces a full-width/full-height flex item; the stage CSS then stretches to its parent's bounds. Fixing the CSS sizing chain is necessary for `FIT` to remain visually undistorted.
- `PhaserCanvas` currently renders `AudioSettingsPanel` alongside the game. Its positioning/open behavior must be adapted to the page-level top bar without overlaying the canvas.
- Preserve the existing game flow, score HUD, pause/result behavior, and touch controls.

## Out of scope
- Changing game mechanics, assets, score presentation inside Phaser, authentication, or the landing page.
