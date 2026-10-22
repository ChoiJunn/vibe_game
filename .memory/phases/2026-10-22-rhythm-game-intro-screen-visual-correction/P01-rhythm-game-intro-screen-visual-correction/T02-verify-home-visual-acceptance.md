# Task: T02 Verify Home Visual Acceptance

## Status: pending

## Goal
Add browser-level checks proving the public home visibly renders its key text and art, animates when motion is allowed, removes the corner circles, fits desktop/mobile viewports, and remains static-but-complete under reduced motion.

## Decision Summary
- Use the existing Playwright Edge project and public `/` route; do not authenticate, mock Cosmos, or call the game-session API.
- Verify rendered CSS and image state rather than relying only on a screenshot or source-level selector presence.

## Implementation

### I01. Desktop/mobile home visual behavior tests
- Related Files:
  - `e2e/auth-shell.spec.ts` :: existing `landing screen exposes the Entra login entry point` test plus new `home intro ...` tests — extend the public home coverage; modify.
  - `src/app/page.tsx` :: `HomePage` — existing semantic text and preview elements used by selectors; read-only.
  - `src/components/game/RhythmStagePreview.tsx` :: `RhythmStagePreview` — existing character, mascot, and note elements used by selectors; read-only.

#### Details
- Add a desktop test that sets viewport to 1920×900, sets reduced motion to `no-preference`, attaches a request listener before `page.goto('/')`, then verifies:
  1. The existing heading, Entra CTA, and instruction remain visible.
  2. `.page-shell--home > .game-frame` is at least 95% of viewport width and at least 800px high.
  3. `.landing-stage__preview` has the same left/right/top/bottom bounds as `.game-frame-content.landing-stage`; its width does not stop at the edge of the content panel.
  4. `.rhythm-preview__character` and `.rhythm-preview__moka` are visible `<img>` elements with `naturalWidth > 0` and bounding rectangles inside the home stage.
  5. `.rhythm-preview__character` computed transform and `.rhythm-preview__note--one` computed `left` value each change after a 1-second interval.
  6. `.game-frame` computed `::before` and `::after` pseudo-elements have `display: none` on `/`.
  7. No request URL contains `/api/game/session` before or after loading the public home.
  8. `document.documentElement.scrollWidth <= window.innerWidth` and `scrollHeight <= window.innerHeight`.
- In the same test, set viewport to 390×844 and recheck that heading, CTA, character, Moka, and the game stage are visible; the stage width stays within the viewport and document has no horizontal overflow.
- Add a reduced-motion test with `page.emulateMedia({ reducedMotion: 'reduce' })` before navigation. Verify the same character, Moka, and lane remain visible, the character and note computed `animationIterationCount` are `1`, and no session request occurs.
- Keep existing auth redirects and Entra CTA assertions. Do not test external sign-in or audio output.
- Capture desktop and mobile screenshots into Playwright artifacts for direct visual review; do not commit screenshot artifacts.

### I02. Verify commands and review evidence
- Related Files:
  - `.memory/phases/2026-10-22-rhythm-game-intro-screen-visual-correction/P01-rhythm-game-intro-screen-visual-correction/T02-verify-home-visual-acceptance.md` :: Validation — record tested Edge command and manual screenshot review; modify as work completes.

#### Details
- Run the targeted Edge test command with one worker to use the already-supported browser channel and avoid missing Chromium binaries.
- Review the produced desktop and mobile screenshots at full size for text contrast, character crop, motion-lane placement, remaining corner shapes, and unnecessary empty regions before marking acceptance criteria done.

## Acceptance Criteria
- [ ] Browser assertions confirm heading/instruction/CTA are visible, legible, and not overlapped at 1920×900 and 390×844.
- [ ] The protagonist and Moka images load and have visible bounds inside the stage at both viewports.
- [ ] Character and note motion values change under normal motion preference and are reduced to one static iteration under reduced motion.
- [ ] Both home-frame corner pseudo-elements are hidden.
- [ ] Public home causes no session API request and retains the Entra sign-in entry point.
- [ ] Desktop and mobile screenshots were reviewed and match all visual requirements.

## Validation
- `npm run test:e2e -- --project=edge --workers=1 --grep "landing screen|home intro"` — all landing/auth and new visual behavior tests pass.
- `npx eslint e2e/auth-shell.spec.ts` — passes for the updated E2E file.
- `npm run typecheck` — passes with the new browser assertions.

## Commit Message
```text
test(home): verify animated intro visuals and responsive fit

Plan: 2026-10-22-rhythm-game-intro-screen-visual-correction
Phase: P01-rhythm-game-intro-screen-visual-correction
Task: T02-verify-home-visual-acceptance

- Assert visible characters and moving notes in the home stage
- Cover reduced motion, corner circles, and mobile fit
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
