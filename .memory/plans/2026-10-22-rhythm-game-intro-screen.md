# Plan: Rhythm Game Intro Screen

## Goal
Turn both the public home page and authenticated `/game` entry into a compact, immersive Office Rhythm Manager start experience. Show an animated, decorative rhythm stage immediately; keep it free of gameplay and database writes until the user explicitly starts. Use the active-session read to offer resume or new game, retain an in-stage retry on service errors, honor reduced motion, and preserve Entra/audio behavior.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Build the shared visual stage, update public and game entry flows, then cover the behavior and align local development guidance. | [P01](../phases/2026-10-22-rhythm-game-intro-screen/P01-rhythm-game-intro-screen/phase.md) |

## Confirmed Constraints
- Public home `/` and authenticated `/game` are both in scope.
- Use existing arrival background, protagonist, and Moka art; add moving note-lane and mint/yellow/coral light accents.
- The home preview is decorative and makes no session writes. Audio starts only after a user gesture.
- `/game` renders the stage before checking the active session; show `이어하기` when found, otherwise `게임 시작`. Create a new session only after the user clicks.
- If session lookup or creation fails, keep the stage visible and offer an error message plus retry.
- Keep the Entra flow; guests see `Entra ID 로그인`, authenticated home visitors see `게임 시작`.
- Reduce outer whitespace and heading size, make the stage fill the available viewport below the existing top bar, retain a compact guide/stats/menu, and honor `prefers-reduced-motion`.
- The local 500 investigation identified an expired Azure CLI token requiring MFA refresh; Cosmos recovered after the user refreshed authentication. A browser-authenticated session request still needs an integration check.

## Scope Note
The local development guide currently describes key authentication as the local default, while the inspected local environment used managed identity. T04 aligns the documented options with the actual supported configuration without copying local secrets or changing authentication defaults.
