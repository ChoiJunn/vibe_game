import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-main">{children}</main>
    </div>
  );
}
