# Decisions: Pattern Practice Judgement Feedback

- Date: 2026-10-23
- Status: Confirmed
- Context: Pattern practice already shows the latest judgement and timing error, flashes the lane, and highlights the Space key. The moving note visuals are not currently connected to the note that was judged, so it is hard to tell at a glance whether a note was hit.

## D01. Per-note judgement feedback
- **Chosen**: When a note is judged, visibly enlarge that note and change its color according to PERFECT, GOOD, or MISS. Keep the existing judgement label and timing error display.
- **Rationale**: A direct visual response on the note makes the hit result immediately apparent while preserving the precise textual result.

## D02. Feedback coverage
- **Chosen**: Apply judgement feedback to the judged note for every supported note type: tap notes, hold bars and both endpoints, and each burst note.
- **Rationale**: Practice feedback should behave consistently across the patterns the player is learning.

## D03. Feedback duration
- **Chosen**: Show the enlargement and grade color as a brief flash for about 350 ms, then return the note to its normal appearance.
- **Rationale**: The response should be easy to notice without leaving old notes highlighted during later beats.

## Codebase findings
- `PracticeViewport.tsx` renders moving notes from beatmap events and receives the latest judgement, including its `eventId`; this can identify which rendered note should react.
- Existing practice feedback already uses separate lane treatments for PERFECT, GOOD, and MISS, plus Space-key feedback and a textual timing error.
- The current moving tap, hold, and burst visuals have no judgement-specific state or styling.

## Scope notes
- This decision covers judgement feedback inside Pattern Codex practice. It does not change the main gameplay screen, beatmap timing rules, scoring, or practice layout.
- Respect the existing reduced-motion preference when implementing the brief enlargement animation.
