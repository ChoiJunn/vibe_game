import type { ReactNode } from 'react';

export function GameViewport({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className="game-frame" role="application" aria-label="Office Rhythm Manager 게임 화면">
      {className ? <div className={className}>{children}</div> : children}
    </div>
  );
}
