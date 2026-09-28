import type { PatternSummary } from "@/content/beatmaps/patternLibrary";

export function PatternBeatPreview({
  pattern,
  sceneName,
  ordinal,
  kindLabel,
}: {
  pattern: PatternSummary;
  sceneName: string;
  ordinal: number;
  kindLabel: string;
}) {
  const duration = Math.max(1, pattern.endMs - pattern.startMs);
  const position = (timeMs: number) => Math.max(0, Math.min(100, ((timeMs - pattern.startMs) / duration) * 100));
  const accessibleLabel = `${kindLabel}, ${sceneName} ${ordinal}, 노트 ${pattern.eventCount}개 미리보기`;

  return <div className="pattern-beat-preview" role="img" aria-label={accessibleLabel}>
    <span className="pattern-beat-preview__track" aria-hidden="true" />
    {pattern.kind === "rest" && <span className="pattern-beat-preview__rest" aria-hidden="true">누르지 않기</span>}
    {pattern.events.map((event) => {
      const left = position(event.startMs);
      if (event.type === "hold") {
        const end = position(event.endMs ?? event.startMs);
        return <span
          key={event.id}
          className="pattern-beat-preview__hold"
          aria-hidden="true"
          style={{ left: `${left}%`, width: `${Math.max(1.5, end - left)}%` }}
        ><i /><i /></span>;
      }
      if (event.type === "burst") {
        const end = position(event.endMs ?? event.startMs);
        const pressCount = Math.max(1, event.requiredPresses ?? 1);
        return <span key={event.id} className="pattern-beat-preview__burst" aria-hidden="true">
          {Array.from({ length: pressCount }, (_, index) => {
            const tickPosition = left + ((end - left) * (pressCount === 1 ? 0.5 : index / (pressCount - 1)));
            return <i key={`${event.id}-${index}`} style={{ left: `${tickPosition}%` }} />;
          })}
        </span>;
      }
      return <i key={event.id} className="pattern-beat-preview__tap" aria-hidden="true" style={{ left: `${left}%` }} />;
    })}
  </div>;
}
