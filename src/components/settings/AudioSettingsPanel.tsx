'use client';

import type { AudioSettings } from '@/game/audio/types';
import { LatencyCalibration } from './LatencyCalibration';

export function AudioSettingsPanel({
  value,
  onChange,
}: Readonly<{ value: AudioSettings; onChange: (settings: AudioSettings) => void }>) {
  const update = (next: Partial<AudioSettings>) => onChange({ ...value, ...next });

  return <details className={'audio-settings'}>
    <summary>사운드와 판정 설정</summary>
    <div className={'audio-settings__body'}>
      <label className={'setting-range'}>
        <span>음악 볼륨 <output>{Math.round(value.musicVolume * 100)}%</output></span>
        <input type={'range'} min={'0'} max={'1'} step={'0.05'} value={value.musicVolume} aria-label={'음악 볼륨'} onChange={(event) => update({ musicVolume: Number(event.target.value) })} />
      </label>
      <label className={'setting-range'}>
        <span>효과음 볼륨 <output>{Math.round(value.sfxVolume * 100)}%</output></span>
        <input type={'range'} min={'0'} max={'1'} step={'0.05'} value={value.sfxVolume} aria-label={'효과음 볼륨'} onChange={(event) => update({ sfxVolume: Number(event.target.value) })} />
      </label>
      <label className={'setting-toggle'}>
        <input type={'checkbox'} checked={value.muted} onChange={(event) => update({ muted: event.target.checked })} />
        <span>모든 소리 음소거</span>
      </label>
      <label className={'setting-range'}>
        <span>입력 지연 보정 <output>{value.inputOffsetMs} ms</output></span>
        <input type={'range'} min={'-150'} max={'150'} step={'5'} value={value.inputOffsetMs} aria-label={'입력 지연 보정'} onChange={(event) => update({ inputOffsetMs: Number(event.target.value) })} />
      </label>
      <LatencyCalibration onCalibrated={(inputOffsetMs) => update({ inputOffsetMs })} />
      <p className={'settings-privacy-note'}>설정은 이 브라우저에만 저장되며 로그인 토큰이나 프로필 정보는 저장하지 않습니다.</p>
    </div>
  </details>;
}
