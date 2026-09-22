'use client';

import { useEffect, useRef, useState } from 'react';
import { MAX_INPUT_OFFSET_MS, MIN_INPUT_OFFSET_MS } from '@/game/audio/types';

const BEAT_INTERVAL_MS = 600;
const SAMPLE_COUNT = 5;

export function LatencyCalibration({ onCalibrated }: Readonly<{ onCalibrated: (offsetMs: number) => void }>) {
  const [active, setActive] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const beatStart = useRef(0);
  const samples = useRef<number[]>([]);
  const onCalibratedRef = useRef(onCalibrated);

  useEffect(() => {
    onCalibratedRef.current = onCalibrated;
  }, [onCalibrated]);

  useEffect(() => {
    if (!active) return;
    beatStart.current = performance.now() + BEAT_INTERVAL_MS;
    const timer = window.setInterval(() => {
      setPulse(Math.floor((performance.now() - beatStart.current) / BEAT_INTERVAL_MS) % 2 === 0);
    }, 80);
    const collect = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const elapsed = performance.now() - beatStart.current;
      const phase = ((elapsed % BEAT_INTERVAL_MS) + BEAT_INTERVAL_MS) % BEAT_INTERVAL_MS;
      samples.current.push(phase <= BEAT_INTERVAL_MS / 2 ? phase : phase - BEAT_INTERVAL_MS);
      setSampleCount(samples.current.length);
      if (samples.current.length >= SAMPLE_COUNT) {
        const averageError = samples.current.reduce((sum, sample) => sum + sample, 0) / SAMPLE_COUNT;
        const offset = Math.round(Math.max(MIN_INPUT_OFFSET_MS, Math.min(MAX_INPUT_OFFSET_MS, -averageError)));
        onCalibratedRef.current(offset);
        setActive(false);
      }
    };
    window.addEventListener('keydown', collect, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('keydown', collect, true);
    };
  }, [active]);

  const begin = () => {
    samples.current = [];
    setSampleCount(0);
    setActive(true);
  };

  return <div className={'latency-calibration'}>
    <div className={`calibration-beat ${pulse ? 'is-pulsing' : ''}`} aria-hidden={'true'}>♪</div>
    <p>박자 원이 커질 때 스페이스바를 다섯 번 눌러 입력 타이밍을 맞춰요.</p>
    {active ? <p role={'status'} aria-live={'polite'}>{sampleCount}/{SAMPLE_COUNT}회 측정 · 박자에 맞춰 스페이스바</p> : null}
    <button type={'button'} onClick={() => active ? setActive(false) : begin()}>
      {active ? '측정 취소' : '타이밍 보정 시작'}
    </button>
  </div>;
}
