export type TutorialStep = {
  id: string;
  title: string;
  body: string;
  hint: string;
  durationMs: number;
};

export const tutorialSteps: readonly TutorialStep[] = [
  {
    id: 'welcome',
    title: '오늘의 업무 리듬에 오신 걸 환영해요',
    body: '사무실의 하루를 소리와 리듬으로 완성해보세요.',
    hint: '다음 버튼을 눌러 시작합니다.',
    durationMs: 6000,
  },
  {
    id: 'start',
    title: '게임 시작',
    body: '게임 화면을 클릭하면 오디오와 리듬 시계가 시작됩니다.',
    hint: '브라우저 오디오 권한은 클릭 순간에 안전하게 요청됩니다.',
    durationMs: 6000,
  },
  {
    id: 'input',
    title: '스페이스바로 업무 처리',
    body: '타이밍 게이지의 중앙에 맞춰 스페이스바를 눌렀다 떼세요.',
    hint: '짧게 누르면 탭, 길게 누르면 홀드 노트입니다.',
    durationMs: 6000,
  },
  {
    id: 'judgement',
    title: 'Perfect · Good · Miss',
    body: '정확할수록 점수와 콤보가 올라가고, Miss는 하트를 줄입니다.',
    hint: 'Perfect를 10회 연속 달성하면 하트를 회복합니다.',
    durationMs: 6000,
  },
  {
    id: 'pause',
    title: '언제든 잠시 멈출 수 있어요',
    body: 'Esc, 일시정지 버튼, 창 전환, 브라우저 뒤로가기는 현재 위치를 보존합니다.',
    hint: '재개하면 같은 위치에서 다시 시작합니다.',
    durationMs: 6000,
  },
];
