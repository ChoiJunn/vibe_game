import type { RunState } from "@/domain/rhythm";
import { getComboMultiplier } from "@/game/state/scorePolicy";
import { RunStatusBadge } from "./RunStatusBadge";
import type { RhythmReport } from "@/game/results/buildRhythmReport";

export function ResultSummary({
  runState,
  elapsedMs,
  pendingSubmission = true,
  submissionError = false,
  onPlayAgain,
  playAgainDisabled = false,
  playAgainLabel = "다시 플레이",
  onExit,
  exitError,
  exitDisabled = false,
  exitLabel = "\uc0c8 \uac8c\uc784",
  report,
  musicUnavailable = false,
}: {
  runState: RunState;
  elapsedMs: number;
  pendingSubmission?: boolean;
  submissionError?: boolean;
  onPlayAgain?: () => void;
  playAgainDisabled?: boolean;
  playAgainLabel?: string;
  onExit?: () => void;
  exitError?: string;
  exitDisabled?: boolean;
  exitLabel?: string;
  report?: RhythmReport;
  musicUnavailable?: boolean;
}) {
  const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));

  return (
    <section className={"result-summary"} aria-labelledby={"result-title"}>
      <div className={"result-card"}>
        <p className={"eyebrow"}>RUN SUMMARY</p>
        <div className={"result-heading"}>
          <h2 id={"result-title"}>오늘의 업무 리듬 결과</h2>
          <RunStatusBadge status={runState.status} />
        </div>
        <div className={"result-score"}>
          {runState.score.toLocaleString()}
          <small> points</small>
        </div>
        <div className={"result-grid"}>
          <span>
            Perfect <strong>{runState.perfectCount}</strong>
          </span>
          <span>
            Good <strong>{runState.goodCount}</strong>
          </span>
          <span>
            Miss <strong>{runState.missCount}</strong>
          </span>
          <span>
            최고 콤보 <strong>{runState.maxCombo}</strong>
          </span>
          <span>
            최종 배율{" "}
            <strong>x{getComboMultiplier(runState.combo).toFixed(1)}</strong>
          </span>
          <span>
            플레이 시간{" "}
            <strong>
              {Math.floor(elapsedSeconds / 60)}:
              {String(elapsedSeconds % 60).padStart(2, "0")}
            </strong>
          </span>
        </div>
        {report ? (
          <div className="rhythm-report" aria-label="리듬 리포트">
            <div className="rhythm-report__headline"><strong>{report.accuracyPercent}%</strong><span>정확도</span></div>
            <div className="rhythm-report__timing"><span>PERFECT {report.timingBuckets.perfect}</span><span>GOOD {report.timingBuckets.good}</span><span>MISS {report.timingBuckets.miss}</span></div>
            <div className="rhythm-report__patterns"><p>가장 강한 패턴 <b>{report.strongestPattern ?? "—"}</b></p><p>다시 연습할 패턴 <b>{report.missedPattern ?? "—"}</b></p></div>
            <div className="rhythm-report__extras"><span>RISK 성공 {report.riskSuccesses}</span><span>실패 {report.riskFailures}</span><span>FEVER {report.feverActivations}회</span></div>
            {report.earnedBadgeIds.length ? <p className="rhythm-report__badges">배지 · {report.earnedBadgeIds.join(" · ")}</p> : null}
            <p className="rhythm-report__next">{report.nextChallenge}</p>
            {musicUnavailable ? <p className="rhythm-report__music" role="status">음악을 불러오지 못했지만 리듬 판정은 계속 기록됐어요.</p> : null}
          </div>
        ) : null}
        <p
          className={"result-submission"}
          role={submissionError ? "alert" : "status"}
        >
          {submissionError
            ? "결과 저장에 실패했습니다. 연결을 확인하고 다시 플레이를 누르면 저장을 재시도한 뒤 새 게임을 시작합니다."
            : pendingSubmission
              ? "결과를 안전하게 저장하고 있어요…"
              : "결과가 저장되었습니다."}
        </p>
        {exitError ? (
          <p className={"result-submission"} role={"alert"}>
            {exitError}
          </p>
        ) : null}
        <div className={"result-actions"}>
          {onPlayAgain && (
            <button
              type={"button"}
              className={"primary"}
              disabled={playAgainDisabled}
              onClick={onPlayAgain}
            >
              {playAgainLabel}
            </button>
          )}
          {onExit && (
            <button type={"button"} disabled={exitDisabled} onClick={onExit}>
              {exitLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
