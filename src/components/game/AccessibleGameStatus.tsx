import type { JudgementResult } from '@/game/judgement/types';
import type { SectionId } from '@/domain/rhythm';

const sectionNames: Record<SectionId, string> = {
  arrival: '출근길', keyboard: '키보드 업무', mail: '메일 확인',
  meeting: '회의', copy: '복사 업무', departure: '퇴근길',
};

const judgementNames: Record<NonNullable<JudgementResult>['judgement'], string> = {
  perfect: '퍼펙트', good: '굿', miss: '미스',
};

export function AccessibleGameStatus({
  section,
  score,
  hearts,
  judgement,
}: Readonly<{ section: SectionId; score: number; hearts: number; judgement?: JudgementResult }>) {
  return <p className={'visually-hidden'} role={'status'} aria-live={'polite'} aria-atomic={'true'}>
    현재 구간 {sectionNames[section]}. 점수 {score}점. 하트 {hearts}개 남음.
    {judgement ? ` 최근 판정 ${judgementNames[judgement.judgement]}.` : ''}
  </p>;
}
