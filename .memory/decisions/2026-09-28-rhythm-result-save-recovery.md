# Decisions: Rhythm Result Save Recovery

- Date: 2026-09-28
- Status: Confirmed
- Context: Production result submissions return `422 invalid_sequence`; the result dialog can remain in a saving state and starting a fresh run is unreliable.

## D01. Leaderboard integrity
- **Chosen**: Only results that pass server-side input replay verification are eligible for leaderboard storage. (User-confirmed)
- **Rationale**: A client-claimed score must not bypass verification; an invalid sequence must remain visibly unsaved rather than be recorded as valid.

## D02. Temporary retention for failed submissions
- **Chosen**: Keep only the most recent failed result in the browser for 24 hours. Do not store authentication tokens with it. (User-confirmed: browser temporary storage, one day; agent recommendation accepted: most recent one only)
- **Rationale**: Preserve enough context for diagnosis/recovery without accumulating stale runs or implying that the server accepted the score. Expire the record automatically.

## D03. Starting a new game after save failure
- **Chosen**: A failed result submission must not, by itself, block starting a new game. Close the previous active session before creating the next one; report a recoverable error if that session cannot be closed. (User-confirmed outcome; close/retry detail is the implementation recommendation)
- **Rationale**: The app has one active session per user, so the old session must be safely finalized to release the active-session lock. Handle stale session versions by fetching the latest state and retrying where safe.

## D04. Failure-state UI
- **Chosen**: Never keep showing “saving” after a definitive HTTP failure. Show that the result was not saved, indicate its 24-hour local retention, and keep the new-game action available once the old session is safely closed. (Agent recommendation consistent with D01-D03)
- **Rationale**: Distinguish server-confirmed results from locally retained recovery data and make the next action clear.

## D05. Verification behavior
- **Chosen**: Diagnose and correct the input-event persistence/replay mismatch; do not weaken server-side sequence verification to make submissions pass. (Agent recommendation consistent with D01)
- **Rationale**: Preserve leaderboard integrity while resolving the `invalid_sequence` rejection.
