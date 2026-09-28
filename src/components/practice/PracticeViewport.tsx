"use client";

import { useEffect, useRef, useState } from "react";
import type { Beatmap } from "@/domain/rhythm";
import { PracticeRunController, type PracticeRunSnapshot } from "@/game/practice/PracticeRunController";

export function PracticeViewport({ beatmap, onComplete, onExit }: { beatmap: Beatmap; onComplete: (snapshot: PracticeRunSnapshot) => void; onExit: () => void }) {
  const controllerRef = useRef<PracticeRunController | null>(null);
  const [snapshot, setSnapshot] = useState<PracticeRunSnapshot>();
  useEffect(() => {
    const controller = new PracticeRunController(beatmap, onComplete);
    controllerRef.current = controller;
    const unsubscribe = controller.subscribe(setSnapshot);
    controller.start();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") { event.preventDefault(); controller.registerJudgement("perfect"); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); unsubscribe(); controller.exit(); };
  }, [beatmap, onComplete]);
  if (!snapshot) return <p role="status">연습을 준비하고 있어요...</p>;
  return <section className="practice-viewport" aria-label="패턴 연습" data-source-pattern-id={beatmap.patterns[0]?.id}>
    <div className="practice-viewport__lane" aria-hidden="true"><span className="practice-viewport__cursor" style={{ left: `${Math.min(100, (snapshot.nextEventIndex / beatmap.events.length) * 100)}%` }} />{beatmap.events.map((event) => <i key={event.id} className={`practice-note practice-note--${event.patternKind}`} />)}</div>
    <p><strong>{snapshot.status === "completed" ? "연습 완료!" : snapshot.status === "paused" ? "일시정지" : "SPACE로 박자를 맞춰보세요"}</strong> · {snapshot.nextEventIndex}/{beatmap.events.length} · 정확도 {snapshot.accuracy}%</p>
    <div className="practice-viewport__stats"><span>PERFECT {snapshot.perfectCount}</span><span>GOOD {snapshot.goodCount}</span><span>MISS {snapshot.missCount}</span></div>
    <div className="practice-viewport__actions">
      <button type="button" className="primary" onClick={() => controllerRef.current?.registerJudgement("perfect")} disabled={snapshot.status !== "playing"}>SPACE 연습</button>
      <button type="button" onClick={() => controllerRef.current?.pause()} disabled={snapshot.status !== "playing"}>일시정지</button>
      <button type="button" onClick={() => controllerRef.current?.resume()} disabled={snapshot.status !== "paused"}>계속하기</button>
      <button type="button" onClick={() => controllerRef.current?.restart()}>다시 연습</button>
      <button type="button" onClick={onExit}>패턴 목록</button>
    </div>
  </section>;
}
