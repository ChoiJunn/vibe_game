# Task: T01 Build Animated Stage Preview

## Status: done

## Goal
Create a reusable, decorative rhythm stage that can be rendered immediately on both `/` and `/game`, using existing Office Rhythm Manager art and restrained CSS motion without starting Phaser, audio, or session requests.

## Decision Summary
- Use the existing `arrival.png`, `protagonist-perfect.png`, and `moka-perfect.png` art, with CSS-generated note lanes and mint/yellow/coral light accents.
- The preview is presentational only, labeled as decorative for assistive technology, responsive, and static under `prefers-reduced-motion: reduce`.

## Implementation

### I01. Reusable preview component
- Related Files:
  - `src/components/game/RhythmStagePreview.tsx` :: `RhythmStagePreview` — new reusable decorative stage markup; new.
  - `public/game/art/background/arrival.png` — existing arrival-scene image; read-only.
  - `public/game/art/character/protagonist-perfect.png` — existing protagonist art; read-only.
  - `public/game/art/mascot/moka-perfect.png` — existing Moka art; read-only.

#### Details
- **Signature**:
  ```tsx
  export function RhythmStagePreview(props: Readonly<{
    className?: string;
    compact?: boolean;
  }>): JSX.Element
  ```
  Use the repository's established React return-type style if JSX namespace typing is unavailable; do not add a dependency.
- **Data and asset fields**: no props carrying user data, game state, session, or audio. Use static paths `/game/art/background/arrival.png`, `/game/art/character/protagonist-perfect.png`, and `/game/art/mascot/moka-perfect.png`.
- **Execution flow / logic**:
  1. Render a stage wrapper with an optional caller class and `data-compact` state when `compact` is true.
  2. Render a static scene label (`OFFICE MORNING` and `출근길의 첫 박자`), existing background and character art, a decorative note lane with at least four note markers, and decorative light/sparkle elements.
  3. Mark the entire visual preview `aria-hidden="true"`; do not render buttons, audio elements, canvas, session hooks, or database calls.
  4. Use `next/image` for raster artwork with explicit dimensions and empty alt text; set priority only when the first viewport usage warrants it. Mark CSS-only visual accents as decorative.

### I02. Preview visuals and motion
- Related Files:
  - `src/app/globals.css` :: `.rhythm-preview*` and keyframes — add preview layout, layering, and animation styles; modify.
  - `src/styles/accessibility.css` :: `@media (prefers-reduced-motion: reduce)` — disable preview motion; modify.
  - `src/styles/tokens.css` :: existing palette tokens — read-only; reuse available `--mint`, `--yellow`, and `--coral` tokens.

#### Details
- Give the preview a contained stacking context, clipped rounded stage, readable contrast over the scene, responsive note-lane geometry, and small-screen layout that keeps the protagonist/Moka visible rather than hiding the entire art scene.
- Animate note markers along the lane and pulse/rise the light and character accents using CSS only. Avoid JS timers and third-party animation packages.
- Place selectors under `.rhythm-preview` and its descendants; avoid broad selectors that alter the existing Phaser canvas or other pages.
- Under reduced motion, stop all preview keyframe animation and transitions while keeping a clear static lane, notes, character, and labels.
- Respect the `compact` variant through a data attribute/class so `/game` can use tighter proportions than the home hero without duplicating the visual component.

## Acceptance Criteria
- [ ] The shared component renders the three existing local images and decorative lane elements without initializing Phaser or audio.
- [ ] The preview fits desktop and mobile widths without removing the character or mascot.
- [ ] Reduced-motion mode displays the same content with no looping animation.
- [ ] Existing home/game styles and Phaser gameplay selectors are not broadly affected.

## Validation
- `npm run lint` — passes with the new component and style selectors.
- `npm run typecheck` — passes without new dependencies or type suppressions.

## Commit Message
```text
feat(game): add animated rhythm stage preview

Plan: 2026-10-22-rhythm-game-intro-screen
Phase: P01-rhythm-game-intro-screen
Task: T01-build-animated-stage-preview

- Reuse the office arrival, protagonist, and Moka artwork
- Add responsive CSS rhythm accents and reduced-motion behavior
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: ac5310e
