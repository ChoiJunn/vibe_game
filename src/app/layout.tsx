import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/auth/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';
import '@/styles/accessibility.css';

export const metadata: Metadata = {
  title: 'Office Rhythm Manager',
  description: '업무의 리듬을 맞추는 사내 오리지널 리듬게임',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
