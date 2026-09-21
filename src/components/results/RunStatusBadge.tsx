import type { RunState } from '@/domain/rhythm';

const STATUS_LABELS: Record<RunState['status'], string> = {
  active: '진행 중',
  paused: '일시정지',
  completed: '완주',
  failed: '실패',
  abandoned: '중단됨',
};

export function RunStatusBadge({ status }: { status: RunState['status'] }) {
  return <span className={`run-status-badge run-status-${status}`}>{STATUS_LABELS[status]}</span>;
}
