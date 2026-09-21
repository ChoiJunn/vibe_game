import type { ReactNode } from 'react';

type StatusVariant = 'info' | 'success' | 'error';

type StatusMessageProps = {
  variant?: StatusVariant;
  title: string;
  children?: ReactNode;
};

const ICONS: Record<StatusVariant, string> = {
  info: 'i',
  success: '✓',
  error: '!',
};

export function StatusMessage({ variant = 'info', title, children }: StatusMessageProps) {
  return (
    <div
      className="status-message"
      data-variant={variant}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="status-message__icon" aria-hidden="true">{ICONS[variant]}</span>
      <div>
        <strong>{title}</strong>
        {children ? <div className="status-message__body">{children}</div> : null}
      </div>
    </div>
  );
}
