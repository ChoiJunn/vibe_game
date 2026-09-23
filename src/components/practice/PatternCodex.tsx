"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import beatmapJson from "@/content/beatmaps/office-day-01.json";
import { getPatternLibrary, type PatternSummary } from "@/content/beatmaps/patternLibrary";
import { validateBeatmap } from "@/domain/validateBeatmap";
import { createPracticeBeatmap } from "@/game/practice/createPracticeBeatmap";
import { useAuth } from "@/auth/useAuth";
import { loadPatternCodex, recordPatternPractice, savePatternCodex, type PatternCodex } from "@/client/game/patternCodexStore";
import { PracticeViewport } from "./PracticeViewport";

const beatmap = validateBeatmap(beatmapJson);
const kinds = ["all", "straight", "offbeat", "transition", "hold", "rest", "burst"] as const;

export function PatternCodex() {
  const { user } = useAuth();
  const [codex, setCodex] = useState<PatternCodex>(() => ({ schemaVersion: 1, beatmapId: beatmap.id, patterns: {}, badges: [] }));
  const [filter, setFilter] = useState<(typeof kinds)[number]>("all");
  const [selected, setSelected] = useState<string>();
  const [practiceOpen, setPracticeOpen] = useState(false);
  const patterns = useMemo(() => getPatternLibrary(beatmap), []);
  useEffect(() => { setCodex(loadPatternCodex(window.localStorage, user?.oid, beatmap.id)); }, [user?.oid]);
  const visible = patterns.filter((pattern) => filter === "all" || pattern.kind === filter).sort((a, b) => Number(Boolean(codex.patterns[a.id]?.mastered)) - Number(Boolean(codex.patterns[b.id]?.mastered)));
  const selectedPattern = patterns.find((pattern) => pattern.id === selected);
  const onComplete = useCallback((snapshot: { patternId: string; status: string; accuracy: number; perfectCount: number }) => {
    if (snapshot.status !== "completed") return;
    const next = recordPatternPractice(codex, { patternId: snapshot.patternId, terminalStatus: "completed", accuracy: snapshot.accuracy, perfectCount: snapshot.perfectCount, now: new Date().toISOString() });
    setCodex(savePatternCodex(window.localStorage, user?.oid, next));
  }, [codex, user?.oid]);
  if (practiceOpen && selectedPattern) return <PracticeViewport beatmap={createPracticeBeatmap(beatmap, selectedPattern.id)} onComplete={onComplete} onExit={() => setPracticeOpen(false)} />;
  return <section className="pattern-codex">
    <div className="pattern-codex__intro"><div><p className="eyebrow">OFFICE RHYTHM LAB</p><h1>패턴 도감</h1><p>엇박과 버스트를 골라서 반복 연습하고, 나만의 리듬 배지를 모아보세요.</p></div><Link href="/game">게임으로 돌아가기</Link></div>
    <div className="pattern-codex__filters" aria-label="패턴 필터">{kinds.map((kind) => <button key={kind} type="button" className={filter === kind ? "is-active" : ""} onClick={() => setFilter(kind)}>{kind === "all" ? "전체" : kind}</button>)}</div>
    <div className="pattern-codex__grid">{visible.map((pattern) => <PatternCard key={pattern.id} pattern={pattern} mastery={codex.patterns[pattern.id]} onPractice={() => { setSelected(pattern.id); setPracticeOpen(true); }} />)}</div>
    <div className="pattern-codex__badges"><h2>획득한 배지</h2>{codex.badges.length ? codex.badges.map((badge) => <span key={badge.id}>{badge.family} · {badge.id}</span>) : <p>첫 패턴을 95% 이상으로 완주하면 배지가 열려요.</p>}</div>
  </section>;
}

function PatternCard({ pattern, mastery, onPractice }: { pattern: PatternSummary; mastery?: PatternCodex["patterns"][string]; onPractice: () => void }) {
  return <article className={`pattern-card pattern-card--${pattern.kind}`}>
    <div className="pattern-card__top"><span>{pattern.kind}</span><span>{mastery?.mastered ? "MASTERED" : "READY"}</span></div>
    <h2>{pattern.label}</h2><p>{pattern.section} · {pattern.eventCount} notes</p>
    <strong>{mastery ? `${Math.round(mastery.bestAccuracy)}%` : "—"}</strong><small>{mastery ? `${mastery.attempts}회 연습` : "아직 기록 없음"}</small>
    <button type="button" className="primary" onClick={onPractice}>연습 시작</button>
  </article>;
}
