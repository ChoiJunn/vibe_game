import type { ReactNode } from 'react';

export function GameViewport({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="game-frame" role="application" aria-label="Office Rhythm Manager 게임 화면">
      {children}
    </div>
  );
}
