# Decision: Remove Tutorial Gate from Game Start

- Date: 2026-10-23
- Status: Confirmed by the user's latest direction; supersedes D01 and D03 in `2026-10-23-rhythm-game-start-flow.md`.

## D01. Home game-start action
- **Chosen**: Clicking the home `게임 시작` action starts gameplay directly. When there is no active saved session, create a session and start it without rendering a tutorial or a second confirmation panel.
- **Rationale**: The user explicitly wants the home CTA to enter gameplay and says the tutorial screen should not appear.

## D02. Existing saved session
- **Chosen**: If an active saved session exists, keep the current `이어하기` and `새 게임` choices. Selecting either starts gameplay directly.
- **Rationale**: Preserve saved progress and avoid replacing it silently.

## D03. Direct game route
- **Chosen**: `/game` without the home start query continues to show its existing explicit game-entry panel; only the tutorial overlay is removed.
- **Rationale**: The requested flow concerns the home `게임 시작` action, and this preserves the direct-route recovery/entry behavior.

## D04. Tutorial assets and preference
- **Chosen**: Remove the tutorial overlay from the game flow and remove its outdated flow tests. Leave standalone tutorial reducer/content files intact unless they have no remaining product use.
- **Rationale**: Avoid deleting reusable tutorial code beyond the requested screen flow.
