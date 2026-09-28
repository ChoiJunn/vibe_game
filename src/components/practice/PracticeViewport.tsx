"use client";

import { useEffect, useRef, useState } from "react";
import type { PracticeChart } from "@/game/practice/createPracticeBeatmap";
import { PracticeRunController, type PracticeLoopResult, type PracticeRunSnapshot } from "@/game/practice/PracticeRunController";

const APPROACH_WINDOW_MS = 1_500;

export function PracticeViewport({ chart, title, onComplete, onExit }: {
  chart: PracticeChart;
  title: string;
  onComplete: (result: PracticeLoopResult) => void;
  onExit: () => void;
}) {
  const controllerRef = useRef<PracticeRunController | null>(null);
  const [snapshot, setSnapshot] = useState<PracticeRunSnapshot>();

  useEffect(() => {
    const controller = new PracticeRunController(chart, onComplete);
    controllerRef.current = controller;
    const unsubscribe = controller.subscribe(setSnapshot);
    controller.start();
    return () => {
      unsubscribe();
      controller.dispose();
      controllerRef.current = null;
    };
  }, [chart, onComplete]);

  if (!snapshot) return <p role="status">연습을 준비하고 있어요...</p>;

  if (snapshot.status === "summary" || snapshot.status === "exited") {
    return <section className="practice-viewport practice-viewport--summary" aria-label="연습 결과 요약" data-source-pattern-id={chart.patternId}>
      <p className="eyebrow">PRACTICE SESSION</p>
      <h1>연습을 마쳤어요</h1>
      <p>선택한 패턴: {title}</p>
      <div className="practice-summary__grid">
        <SummaryItem label="완주 루프" value={`${snapshot.completedLoops}회`} />
        <SummaryItem label="최고 정확도" value={snapshot.bestCompletedLoopAccuracy === undefined ? "완주 기록 없음" : `${snapshot.bestCompletedLoopAccuracy}%`} />
        <SummaryItem label="PERFECT" value={`${snapshot.sessionPerfectCount}회`} />
        <SummaryItem label="GOOD" value={`${snapshot.sessionGoodCount}회`} />
        <SummaryItem label="MISS" value={`${snapshot.sessionMissCount}회`} />
      </div>
      {snapshot.completedLoops === 0 && <p className="practice-summary__empty">완료한 루프가 없어요. 연습한 구간은 통계에 포함되지 않았습니다.</p>}
      <button type="button" className="practice-control practice-control--primary" onClick={onExit}>변형 목록으로</button>
    </section>;
  }

  return <section className="practice-viewport" aria-label="패턴 연습" data-source-pattern-id={chart.patternId}>
    <header className="practice-viewport__heading">
      <div>
        <p className="eyebrow">PATTERN PRACTICE · {snapshot.completedLoops}회 완주</p>
        <h1>{title}</h1>
      </div>
      <p className="practice-viewport__loop-count">LOOP {snapshot.completedLoops + 1}</p>
    </header>

    <div className={`practice-viewport__lane${snapshot.lastJudgement ? ` is-${snapshot.lastJudgement.judgement}` : ""}`} aria-label="이동하는 노트와 판정선">
      <span className="practice-viewport__judge-line" aria-hidden="true" />
      <span className="practice-viewport__lane-center" aria-hidden="true" />
      {chart.beatmap.events.map((event) => {
        const deltaMs = event.startMs - snapshot.songPositionMs;
        if (deltaMs < -180 || deltaMs > APPROACH_WINDOW_MS) return null;
        const left = 24 + (deltaMs / APPROACH_WINDOW_MS) * 70;
        if (event.type === "hold") {
          const duration = Math.max(0, (event.endMs ?? event.startMs) - event.startMs);
          return <span
            key={event.id}
            className="practice-moving-note practice-moving-note--hold"
            style={{ left: `${left}%`, width: `${Math.max(1, (duration / APPROACH_WINDOW_MS) * 70)}%` }}
            aria-hidden="true"
          ><i /><i /></span>;
        }
        if (event.type === "burst") {
          const duration = Math.max(0, (event.endMs ?? event.startMs) - event.startMs);
          const count = Math.max(1, event.requiredPresses ?? 1);
          return <span className="practice-moving-note practice-moving-note--burst" key={event.id} aria-hidden="true">
            {Array.from({ length: count }, (_, index) => <i
              key={`${event.id}-${index}`}
              style={{ left: `${left + ((duration / APPROACH_WINDOW_MS) * 70 * (count === 1 ? 0.5 : index / (count - 1)))}%` }}
            />)}
          </span>;
        }
        return <i key={event.id} className="practice-moving-note practice-moving-note--tap" style={{ left: `${left}%` }} aria-hidden="true" />;
      })}
    </div>

    {snapshot.status === "countdown" && <p className="practice-count-in" role="status">준비! {snapshot.countInBeat > 0 ? `${snapshot.countInBeat} / 4` : "박자 준비 중"}</p>}
    {snapshot.status === "paused" && <p className="practice-count-in" role="status">일시정지 · {snapshot.completedLoops}회 완주</p>}
    <div className="practice-live-feedback" aria-live="polite">
      {snapshot.lastJudgement
        ? <><strong className={`practice-live-feedback__judge is-${snapshot.lastJudgement.judgement}`}>{snapshot.lastJudgement.judgement.toUpperCase()}</strong><span>오차 {snapshot.lastJudgement.errorMs > 0 ? "+" : ""}{Math.round(snapshot.lastJudgement.errorMs)} ms</span></>
        : <strong>판정선에 노트를 맞춰 눌러보세요</strong>}
      <span>현재 루프 정확도 {snapshot.accuracy}%</span>
    </div>
    <div className="practice-viewport__stats" aria-label="현재 루프 판정 수">
      <span>PERFECT {snapshot.perfectCount}</span><span>GOOD {snapshot.goodCount}</span><span>MISS {snapshot.missCount}</span>
    </div>
    <div className="practice-viewport__session-stats" aria-label="전체 연습 통계">
      <span>완주 {snapshot.completedLoops}회</span>
      <span>최고 정확도 {snapshot.bestCompletedLoopAccuracy === undefined ? "—" : `${snapshot.bestCompletedLoopAccuracy}%`}</span>
      <span>전체 P/G/M {snapshot.sessionPerfectCount}/{snapshot.sessionGoodCount}/{snapshot.sessionMissCount}</span>
    </div>
    {snapshot.musicStatus === "loading" && <p className="practice-audio-status" role="status">배경 음악을 불러오고 있어요.</p>}
    {snapshot.audioUnavailable && <p className="practice-audio-status is-unavailable" role="status">배경 음악을 사용할 수 없어도 박자 연습은 계속할 수 있어요.</p>}
    <div className="practice-viewport__actions">
      {snapshot.status === "paused"
        ? <button type="button" className="practice-control practice-control--primary" onClick={() => controllerRef.current?.resume()}>이어하기</button>
        : <button type="button" className="practice-control practice-control--primary" onClick={() => controllerRef.current?.pause()}>일시정지</button>}
      <button type="button" className="practice-control" onClick={() => controllerRef.current?.exit()}>연습 종료</button>
    </div>
  </section>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="practice-summary__item"><span>{label}</span><strong>{value}</strong></div>;
}
