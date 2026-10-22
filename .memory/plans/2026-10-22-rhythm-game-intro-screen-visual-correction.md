# Plan: Rhythm Game Intro Screen Visual Correction

## Goal
Repair the public home screen so its title and start action are immediately readable, the game scene fills the available viewport with less empty space, the protagonist and mascot are visible, the rhythm motion is noticeable, and the unwanted corner circles are gone.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Correct the home visual hierarchy and prove the visible art, motion, reduced-motion behavior, and responsive fit in a browser. | [P01](../phases/2026-10-22-rhythm-game-intro-screen-visual-correction/P01-rhythm-game-intro-screen-visual-correction/phase.md) |

## Confirmed Constraints
- Only the public home screen `/` is the visual target identified by the supplied screenshot.
- Retain the decorative, non-playable rhythm preview; do not create a game session or start gameplay before an explicit user action.
- Reuse the existing arrival background, protagonist, and Moka artwork; make the character and moving lane visually evident.
- Remove the unwanted top-right and bottom-left decorative circles from the home card.
- Keep Entra authentication and the current public-home CTA behavior unchanged.
- Keep text readable over the art, reduce unused outer space, and fit the stage to the viewport below the existing top bar.
- Honor `prefers-reduced-motion`; in that mode the preview remains visible in a clear static state.

## Scope Note
The current local render loads the character and runs CSS motion, but layout inspection found that the preview currently occupies only about 1275px of a 1893px stage at 1920×900. The `.landing-stage__preview` and `.rhythm-preview` rules tie in specificity, and the later generic `position:relative` wins, so the background fails to fill the stage. The home container also extends about 11px below the viewport. The user-provided screenshot shows a different state. The documented Azure URL timed out in this environment, so the plan fixes and verifies the checked-out source and leaves deployed-screen confirmation for when that host is reachable.
