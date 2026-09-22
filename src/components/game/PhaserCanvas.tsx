'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import beatmapJson from '@/content/beatmaps/office-day-01.json';
import testBeatmapJson from '@/content/beatmaps/e2e-quick-beatmap';
import { useAuth } from '@/auth/useAuth';
import { isE2eAuthEnabled } from '@/auth/AuthProvider';
import { settingsStore } from '@/client/settings/settingsStore';
import { SessionApiClient } from '@/client/game/sessionApi';
import { PauseOverlay } from './PauseOverlay';
import { AudioSettingsPanel } from '@/components/settings/AudioSettingsPanel';
import { AccessibleGameStatus } from './AccessibleGameStatus';
import { ResultSummary } from '@/components/results/ResultSummary';
import { validateBeatmap } from '@/domain/validateBeatmap';
import { AudioClock } from '@/game/audio/AudioClock';
import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from '@/game/audio/types';
import { RhythmGameController, type RhythmGameSnapshot } from '@/game/RhythmGameController';
import { SpaceInputController } from '@/game/input/SpaceInputController';
import { AutosaveCoordinator, type AutosaveState } from '@/game/persistence/AutosaveCoordinator';
import { PauseCoordinator, type PauseState } from '@/game/pause/PauseCoordinator';
import { usePageLifecyclePause } from '@/hooks/usePageLifecyclePause';
import type { TerminalRunStatus } from '@/server/cosmos/models';

type GameRuntime = {
  controller: RhythmGameController;
  snapshot: RhythmGameSnapshot;
  pauseState: PauseState;
  autosaveState: AutosaveState;
};

export function PhaserCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const startGameRef = useRef<(() => void) | null>(null);
  const controllerRef = useRef<RhythmGameController | null>(null);
  const autosaveRef = useRef<AutosaveCoordinator | null>(null);
  const retryTerminalRef = useRef<(() => Promise<void>) | null>(null);
  const restartingRef = useRef(false);
  const settingsRef = useRef<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const terminalSubmittedRef = useRef(false);
  const { getIdToken, user } = useAuth();
  const router = useRouter();
  const userOid = user?.oid;
  const tokenProviderRef = useRef(getIdToken);
  const [runtime, setRuntime] = useState<GameRuntime | null>(null);
  const [coordinator, setCoordinator] = useState<PauseCoordinator | null>(null);
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [submission, setSubmission] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string>();
  useEffect(() => {
    tokenProviderRef.current = getIdToken;
  }, [getIdToken]);
  usePageLifecyclePause(coordinator);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = settingsStore.load();
      settingsRef.current = stored;
      setSettings(stored);
      setSettingsReady(true);
    });
  }, []);

  const changeSettings = useCallback((next: AudioSettings) => {
    const saved = settingsStore.save(next);
    settingsRef.current = saved;
    setSettings(saved);
    controllerRef.current?.setAudioSettings(saved);
  }, []);

  const handlePlayAgain = useCallback(async () => {
    if (restartingRef.current || submission === 'idle' || submission === 'saving') return;
    restartingRef.current = true;
    setRestarting(true);
    try {
      if (submission === 'error') {
        const retryTerminal = retryTerminalRef.current;
        if (!retryTerminal) throw new Error('The failed result cannot be retried yet.');
        await retryTerminal();
      }
      window.location.reload();
    } catch {
      restartingRef.current = false;
      setRestarting(false);
    }
  }, [submission]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !settingsReady || !userOid) return;
    let disposed = false;
    let game: import('phaser').Game | null = null;
    let startedInEffect = false;
    let startGameHandler: (() => void) | undefined;
    let unsubscribeController: () => void = () => undefined;
    let unsubscribePause: () => void = () => undefined;
    let unsubscribeAutosave: () => void = () => undefined;
    const beatmap = validateBeatmap(isE2eAuthEnabled() ? testBeatmapJson : beatmapJson);
    const api = new SessionApiClient(() => tokenProviderRef.current());

    const bootstrap = async () => {
      try {
        const activeSession = await api.getActive();
        const envelope = activeSession ?? await api.createOrResume();
        if (disposed) return;
        const storedSnapshot = envelope.session.snapshot;
        // The result is submitted separately from the autosaved snapshot. If
        // submission failed before a reload, zero hearts identifies the failed
        // run so we can show its result and retry submission instead of pausing it.
        const recoveredFailure = storedSnapshot.hearts <= 0;
        const snapshot = recoveredFailure
          ? { ...storedSnapshot, status: 'failed' as const }
          : storedSnapshot;
        terminalSubmittedRef.current = false;
        setSubmission('idle');
        const controller = new RhythmGameController({
          beatmap,
          clock: new AudioClock(),
          audioSettings: settingsRef.current,
          runId: envelope.session.id,
          userOid,
          initialRunState: snapshot,
        });
        controllerRef.current = controller;
        const autosave = new AutosaveCoordinator({
          api, runId: envelope.session.id, version: envelope.version,
          readSnapshot: () => controller.getSnapshot().runState,
        });
        autosaveRef.current = autosave;
        autosave.start();
        const input = new SpaceInputController({
          inputTarget: mount,
          blurTarget: window,
          isViewportFocused: () => document.activeElement === mount,
          getGameState: () => controller.getSnapshot().clockState,
          getSongPositionMs: () => controller.getSongPositionMs(),
          getInputOffsetMs: () => settingsRef.current.inputOffsetMs,
          initialSequence: envelope.session.inputEvents.length,
          onPersistInput: (event) => autosave.recordInput(event),
          onInput: (event) => controller.handleInput(event),
          onPauseRequest: () => controller.pause(),
        });
        controller.attachInputController(input);
        const pauseCoordinator = new PauseCoordinator(controller);
        setCoordinator(pauseCoordinator);
        setRuntime({ controller, snapshot: controller.getSnapshot(), pauseState: pauseCoordinator.getState(), autosaveState: autosave.getState() });
        unsubscribeController = controller.subscribe((next) => {
          setRuntime((current) => current ? { ...current, snapshot: next } : current);
          if (['completed', 'failed', 'abandoned'].includes(next.runState.status)) {
            void submitTerminal(next.runState.status as TerminalRunStatus, next.runState);
          }
        });
        unsubscribeAutosave = autosave.subscribe((next) => {
          setRuntime((current) => current ? { ...current, autosaveState: next } : current);
        });
        let wasPaused = false;
        unsubscribePause = pauseCoordinator.subscribe((next) => {
          setRuntime((current) => current ? { ...current, pauseState: next } : current);
          if (next.paused && next.reason) {
            void autosave.pause(next.reason).catch(() => undefined);
          } else if (wasPaused) {
            void autosave.saveNow({ ...controller.getSnapshot().runState, status: 'active' });
          }
          wasPaused = next.paused;
        });

        const startGame = () => {
          if (snapshot.status === 'failed') return;
          mount.focus();
          if (startedInEffect) return;
          startedInEffect = true;
          setStarted(true);
          void controller.start(snapshot.cursorMs, snapshot).catch((error: unknown) => {
            startedInEffect = false;
            setStarted(false);
            setLoadError(error instanceof Error ? error.message : '게임을 시작하지 못했습니다.');
          });
        };
        startGameHandler = startGame;
        startGameRef.current = startGame;
        mount.addEventListener('pointerdown', startGameHandler);
        if (activeSession && !recoveredFailure) {
          pauseCoordinator.restorePaused('browser-back', snapshot);
        }
        void import('@/game/PhaserGame').then(({ createPhaserGame }) => {
          if (!disposed) game = createPhaserGame(mount, controller);
        });

        function submitTerminal(status: TerminalRunStatus, finalSnapshot: RhythmGameSnapshot['runState']) {
          if (terminalSubmittedRef.current) return;
          terminalSubmittedRef.current = true;
          autosave.stop();
          const saveTerminalResult = async () => {
            setSubmission('saving');
            await autosave.flush({ ...finalSnapshot, status: 'active' });
            await api.submitResult(envelope.session.id, status, finalSnapshot);
            setSubmission('saved');
            controller.stop();
          };
          retryTerminalRef.current = saveTerminalResult;
          void saveTerminalResult().catch(() => setSubmission('error'));
        }
      } catch (error) {
        if (!disposed) setLoadError(error instanceof Error ? error.message : '저장된 게임을 불러오지 못했습니다.');
      }
    };

    void bootstrap();
    return () => {
      disposed = true;
      if (startGameHandler) mount.removeEventListener('pointerdown', startGameHandler);
      startGameRef.current = null;
      retryTerminalRef.current = null;
      autosaveRef.current?.stop();
      unsubscribeController();
      unsubscribePause();
      unsubscribeAutosave();
      controllerRef.current?.dispose();
      controllerRef.current = null;
      autosaveRef.current = null;
      game?.destroy(true);
    };
  }, [settingsReady, userOid]);

  const snapshot = runtime?.snapshot;
  const runStatus = snapshot?.runState.status;
  const hasResult = runStatus === 'completed' || runStatus === 'failed' || runStatus === 'abandoned';

  return <>
    <div ref={mountRef} className={'phaser-canvas-shell'} tabIndex={0} aria-label={'Office Rhythm Manager 리듬 게임 화면'} />
    {!runtime && !loadError ? <p role={'status'}>저장된 게임을 불러오는 중이에요…</p> : null}
    {loadError ? <p role={'alert'}>{loadError}</p> : null}
    {runtime && !started && !runtime.pauseState.paused && !hasResult ? (
      <button className={'primary'} type={'button'} onClick={() => startGameRef.current?.()}>리듬 시작</button>
    ) : null}
    {runtime?.autosaveState.status === 'error' || runtime?.autosaveState.status === 'conflict' ? (
      <p role={'alert'}>게임 저장에 문제가 있어요. 네트워크 연결을 확인해 주세요.</p>
    ) : null}
    {runtime && snapshot ? <AccessibleGameStatus
      section={snapshot.section}
      score={snapshot.runState.score}
      hearts={snapshot.runState.hearts}
      judgement={snapshot.lastJudgement}
    /> : null}
    {runtime && started && !runtime.pauseState.paused && snapshot?.clockState === 'playing' && !hasResult ? (
      <button type={'button'} className={'pause-button'} onClick={() => coordinator?.requestPause('button')}>일시정지</button>
    ) : null}
    {runtime ? <PauseOverlay
      paused={runtime.pauseState.paused}
      reason={runtime.pauseState.reason}
      snapshot={runtime.pauseState.snapshot}
      onResume={() => { setStarted(true); void coordinator?.resume(); }}
      onAbandon={() => runtime.controller.abandon()}
    /> : null}
    {runtime && snapshot && hasResult ? <ResultSummary
      runState={snapshot.runState}
      elapsedMs={snapshot.songPositionMs}
      pendingSubmission={submission === 'idle' || submission === 'saving'}
      submissionError={submission === 'error'}
      onPlayAgain={() => void handlePlayAgain()}
      playAgainDisabled={submission === 'idle' || submission === 'saving' || restarting}
      playAgainLabel={restarting ? '새 게임 준비 중…' : submission === 'error' ? '저장 후 다시 플레이' : '다시 플레이'}
      onExit={() => router.push('/leaderboard')}
    /> : null}
    <AudioSettingsPanel value={settings} onChange={changeSettings} />
  </>;
}
