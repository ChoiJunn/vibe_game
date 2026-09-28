# Decisions: Pattern Codex and Practice Mode

- Date: 2026-09-28
- Status: Confirmed
- Context: The pattern catalog is difficult to understand, and practice mode currently advances on any Space press as a perfect judgement without real timing, misses, or soundtrack playback. Main gameplay currently accepts keyboard Space only; it has no on-screen press control.

## D01. Practice judgement and audio
- **Chosen**: Practice uses the same timing judgement rules as the main game and plays the selected pattern's corresponding source-audio segment.
- **Rationale**: The practice should build transferable timing, rather than grant a perfect judgement on every press.

## D02. Pattern catalog grouping
- **Chosen**: Show one top-level card per pattern kind. Opening a card lets the user select among all distinct source-pattern variations of that kind; do not remove those variations.
- **Rationale**: Reduce repeated-looking cards without discarding the different phrases already authored in the beatmap.

## D03. Localized names and variation previews
- **Chosen**: Use Korean names and short plain-language explanations: 정박, 엇박, 박자 전환, 길게 누르기, 쉼표, 빠른 연타. Identify each variation by work scene and ordinal, and show a mini beat diagram with tap/hold/burst positions.
- **Rationale**: Make the catalog understandable without requiring users to infer English music terminology or open every practice first.

## D04. Repetition lifecycle
- **Chosen**: After an initial short count-in, loop the selected source-audio segment and pattern continuously until the user pauses or exits. Do not show a blocking result dialog between loops. Show judgement feedback and running session stats during play; show the combined session summary on exit.
- **Rationale**: Practice should not interrupt the user's flow after each short phrase.

## D05. Miss and failure behavior
- **Chosen**: Practice has no hearts or game-over state. Missed notes are automatically judged as misses, the current variation completes, and practice continues looping until the user exits.
- **Rationale**: A practice mistake should be measurable feedback, not a reason to stop practicing.

## D06. Input device support
- **Chosen**: Support keyboard Space on desktop and a press control on touch devices in both practice mode and the main game. The touch control must emit genuine press and release input through the same judgement path, including holds and repeated burst presses; it must not directly award a perfect judgement. Hide the touch control on non-touch desktop layouts.
- **Rationale**: Keep input behavior fair and consistent while making touch play possible. Main-game input currently lacks this control, so the main game must receive it too.

## D07. Practice presentation
- **Chosen**: Use a rhythm lane with moving notes and a judgement line, adapted for practice. Do not include the main-game character, hearts, or game-over UI.
- **Rationale**: Preserve a familiar timing reference while keeping the practice screen focused on the selected phrase and progress.

## D08. Variation progress and session summary
- **Chosen**: Track completed loops separately per selected variation, retain each variation's best accuracy and practice count, and aggregate progress at its kind card. Exclude an incomplete loop when exiting. Show completed loop count, best accuracy, and accumulated judgement counts in the exit summary.
- **Rationale**: Variations sharing a kind can still have different rhythms; progress should reflect which phrase the user actually mastered.

## D09. Judgement consistency
- **Chosen**: Reuse the main game's authored judgement rules, including its current PERFECT/GOOD timing windows and tap, hold, burst input semantics. Automatic misses must use the practice clock and advance the selected loop correctly.
- **Rationale**: Prevent practice results from disagreeing with the main game and avoid timing-free manual advancement.

## D10. Existing progression data
- **Chosen**: Preserve local per-user pattern progress and badges where compatible; adapt the catalog presentation to category-level aggregate progress and variation-level details. Do not store authentication tokens as practice data.
- **Rationale**: The repository already persists codex mastery locally, and regrouping the UI should not discard compatible history.
