# Decisions: Pattern Practice Loop Note Approach

- Date: 2026-10-23
- Status: Confirmed

## D01. Note lead-in on each practice loop
- **Chosen**: Preserve original music timing and give each practice loop up to a 1.5-second lead-in, based on available source audio before the first event. Pattern 001 has only 968 ms of source audio before its first event, so it uses 968 ms on every repetition; patterns with at least 1.5 seconds of preceding source audio use the full 1.5 seconds. Do not shift chart events away from their source audio timing.
- **Rationale**: Pattern 001's first event is at 968 ms from the start of the bundled track, so a full 1.5-second lead-in would require audio from before the track begins or would move the event out of sync. A source-bounded lead-in still makes the note visibly approach from the right instead of appearing at the judgement line.

## D02. Use the initial count-in as the first loop's pre-roll
- **Chosen**: Keep the existing four-beat count-in separate from chart time. After the count-in, start the source-synced chart at 0 ms with no additional wait; the first note then approaches for its source-bounded lead-in. Apply the same source-bounded lead-in on subsequent loop restarts.
- **Rationale**: Advancing chart time during the 1.55-second count-in would pass Pattern 001's first event at 968 ms before input becomes available. Keeping the count-in separate avoids an automatic first-note miss while preserving the original audio alignment.

## D03. Preserve the existing judgement and practice flow
- **Chosen**: Keep current loop judgement windows, input behavior, loop-completion feedback, and practice controls. This change only addresses the first-note approach timing at initial entry and loop restart.
- **Rationale**: The reported problem is that the next loop's first note appears too late to anticipate; other practice behavior was not requested to change.
