"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import beatmapJson from "@/content/beatmaps/office-day-01.json";
import {
  groupPatternsByKind,
  type PatternGroup,
  type PatternSummary,
} from "@/content/beatmaps/patternLibrary";
import type { PatternKind, SectionId } from "@/domain/rhythm";
import { validateBeatmap } from "@/domain/validateBeatmap";
import { createPracticeBeatmap } from "@/game/practice/createPracticeBeatmap";
import { useAuth } from "@/auth/useAuth";
import { getCodexStorageKey, loadPatternCodex, recordPatternPractice, savePatternCodex, type PatternCodex } from "@/client/game/patternCodexStore";
import { PracticeViewport } from "./PracticeViewport";
import { PatternBeatPreview } from "./PatternBeatPreview";

const beatmap = validateBeatmap(beatmapJson);
const sceneNames: Record<SectionId, string> = {
  arrival: "출근길",
  keyboard: "키보드 업무",
  mail: "메일 확인",
  meeting: "회의",
  copy: "복사 업무",
  departure: "퇴근길",
};

type PatternVariation = PatternSummary & { ordinal: number };

export function PatternCodex() {
  const { user } = useAuth();
  const userOid = user?.oid;
  const [codex, setCodex] = useState<PatternCodex>(() => ({ schemaVersion: 1, beatmapId: beatmap.id, patterns: {}, badges: [] }));
  const codexRef = useRef(codex);
  const [codexLoaded, setCodexLoaded] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [filter, setFilter] = useState<PatternKind | "all">("all");
  const [selectedKind, setSelectedKind] = useState<PatternKind | null>(null);
  const [selected, setSelected] = useState<string>();
  const [practiceOpen, setPracticeOpen] = useState(false);
  const groups = useMemo(() => groupPatternsByKind(beatmap), []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const storage = window.localStorage;
        storage.getItem(getCodexStorageKey(userOid, beatmap.id));
        const loaded = loadPatternCodex(storage, userOid, beatmap.id);
        codexRef.current = loaded;
        setCodex(loaded);
        setStorageWarning(false);
      } catch {
        setStorageWarning(true);
      }
      setCodexLoaded(true);
    });
    return () => { active = false; };
  }, [userOid]);

  const visibleGroups = groups.filter((group) => filter === "all" || group.kind === filter);
  const selectedGroup = groups.find(({ kind }) => kind === selectedKind);
  const variations = selectedGroup ? addVariationOrdinals(selectedGroup) : [];
  const selectedPattern = groups.flatMap(({ variations: items }) => items).find((pattern) => pattern.id === selected);
  const selectedVariation = variations.find((pattern) => pattern.id === selected);
  const selectedTitle = selectedGroup && selectedVariation
    ? `${sceneNames[selectedVariation.section]} · ${selectedGroup.label} ${selectedVariation.ordinal}`
    : selectedPattern?.label ?? selected;
  const selectedPracticeChart = useMemo(
    () => selectedPattern ? createPracticeBeatmap(beatmap, selectedPattern.id) : undefined,
    [selectedPattern],
  );
  const onComplete = useCallback((result: { patternId: string; accuracy: number; perfectCount: number; goodCount: number; missCount: number }) => {
    const next = recordPatternPractice(codexRef.current, { patternId: result.patternId, terminalStatus: "completed", accuracy: result.accuracy, perfectCount: result.perfectCount, now: new Date().toISOString() });
    codexRef.current = next;
    setCodex(next);
    try {
      savePatternCodex(window.localStorage, userOid, next);
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [userOid]);

  if (practiceOpen && selectedPracticeChart) {
    return <>
      {storageWarning && <p className="pattern-codex__storage-warning" role="status">이 브라우저에서는 연습 기록을 저장하지 못했어요. 연습은 계속할 수 있습니다.</p>}
      <PracticeViewport chart={selectedPracticeChart} title={selectedTitle ?? selectedPracticeChart.patternId} onComplete={onComplete} onExit={() => setPracticeOpen(false)} storageWarning={storageWarning} />
    </>;
  }

  return <section className="pattern-codex">
    <div className="pattern-codex__intro">
      <div>
        <p className="eyebrow">OFFICE RHYTHM LAB</p>
        <h1>패턴 도감</h1>
        <p>리듬 종류를 고르고, 장면별 패턴을 박자 모양으로 확인해보세요.</p>
      </div>
      <Link href="/game">게임으로 돌아가기</Link>
    </div>

    {storageWarning && <p className="pattern-codex__storage-warning" role="status">이 브라우저에서는 연습 기록을 저장하지 못했어요. 연습은 계속할 수 있습니다.</p>}
    <div className="pattern-codex__filters" aria-label="리듬 종류 필터">
      <button type="button" className={filter === "all" ? "is-active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>전체</button>
      {groups.map((group) => <button key={group.kind} type="button" className={filter === group.kind ? "is-active" : ""} aria-pressed={filter === group.kind} onClick={() => setFilter(group.kind)}>{group.label}</button>)}
    </div>

    {selectedGroup ? (
      <section className="pattern-codex__variations" aria-labelledby="pattern-variation-heading">
        <div className="pattern-codex__section-heading">
          <div>
            <p className="eyebrow">{selectedGroup.variations.length}개 패턴</p>
            <h2 id="pattern-variation-heading">{selectedGroup.label}</h2>
            <p>{selectedGroup.description}</p>
          </div>
          <button type="button" className="pattern-codex__back" onClick={() => setSelectedKind(null)}>종류 목록</button>
        </div>
        <div className="pattern-variation-list" aria-label={`${selectedGroup.label} 패턴 변형`}>
          {variations.map((pattern) => {
            const mastery = codex.patterns[pattern.id];
            const durationSeconds = Math.max(1, Math.round((pattern.endMs - pattern.startMs) / 100) / 10);
            return <article className="pattern-variation" key={pattern.id}>
              <div className="pattern-variation__copy">
                <h3>{sceneNames[pattern.section]} · {selectedGroup.label} {pattern.ordinal}</h3>
                <p>{pattern.eventCount}개 노트 <span aria-hidden="true">·</span> {durationSeconds}초</p>
                {mastery ? <small>{mastery.mastered ? "숙련 완료 · " : ""}최고 정확도 {Math.round(mastery.bestAccuracy)}% · {mastery.successes}회 완주</small> : <small>아직 연습 기록 없음</small>}
              </div>
              <PatternBeatPreview pattern={pattern} sceneName={sceneNames[pattern.section]} ordinal={pattern.ordinal} kindLabel={selectedGroup.label} />
              <button
                type="button"
                className="pattern-variation__start"
                aria-label={`${sceneNames[pattern.section]} · ${selectedGroup.label} ${pattern.ordinal}, ${pattern.eventCount}개 노트, 연습 시작`}
                onClick={() => { setSelected(pattern.id); setPracticeOpen(true); }}
              >연습 시작</button>
            </article>;
          })}
        </div>
      </section>
    ) : (
      <div className="pattern-codex__grid" aria-label="리듬 종류">
        {visibleGroups.map((group) => <PatternKindCard
          key={group.kind}
          group={group}
          codex={codex}
          codexLoaded={codexLoaded}
          onSelect={() => setSelectedKind(group.kind)}
        />)}
      </div>
    )}

    <div className="pattern-codex__badges"><h2>획득한 배지</h2>{codex.badges.length ? codex.badges.map((badge) => <span key={badge.id}>{badge.family} · {badge.id}</span>) : <p>첫 패턴을 95% 이상으로 완주하면 배지가 열려요.</p>}</div>
  </section>;
}

function PatternKindCard({ group, codex, codexLoaded, onSelect }: { group: PatternGroup; codex: PatternCodex; codexLoaded: boolean; onSelect: () => void }) {
  const mastered = group.variations.filter(({ id }) => codex.patterns[id]?.mastered).length;
  const completedLoops = group.variations.reduce((total, { id }) => total + (codex.patterns[id]?.successes ?? 0), 0);
  const bestAccuracy = group.variations.reduce((best, { id }) => Math.max(best, codex.patterns[id]?.bestAccuracy ?? 0), 0);

  return <button type="button" className={`pattern-kind-card pattern-kind-card--${group.kind}`} onClick={onSelect}>
    <span className="pattern-kind-card__eyebrow">리듬 종류</span>
    <span className="pattern-kind-card__title">{group.label}</span>
    <span className="pattern-kind-card__description">{group.description}</span>
    <span className="pattern-kind-card__count">패턴 {group.variations.length}개</span>
    <span className="pattern-kind-card__progress">{codexLoaded ? <>숙련 {mastered}/{group.variations.length} <span aria-hidden="true">·</span> 완주 {completedLoops}회 <span aria-hidden="true">·</span> 최고 {bestAccuracy}%</> : "기록 불러오는 중"}</span>
    <span className="pattern-kind-card__action">변형 살펴보기 <span aria-hidden="true">→</span></span>
  </button>;
}

function addVariationOrdinals(group: PatternGroup): PatternVariation[] {
  const counts = new Map<string, number>();
  return group.variations.map((pattern) => {
    const key = `${pattern.section}:${pattern.kind}`;
    const ordinal = (counts.get(key) ?? 0) + 1;
    counts.set(key, ordinal);
    return { ...pattern, ordinal };
  });
}
