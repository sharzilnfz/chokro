import type { ReactNode } from 'react';
import { cx } from '../../lib/formatters';

export type NoticeTone = 'success' | 'error' | 'warning' | 'info';

export type AdminStatusMessageProps = {
  tone?: NoticeTone;
  children: ReactNode;
  className?: string;
  onDismiss?: () => void;
};

export function AdminStatusMessage({
  tone = 'success',
  children,
  className = '',
  onDismiss,
}: AdminStatusMessageProps) {
  if (!children) return null;

  return (
    <div
      className={cx('admin-status-message', className)}
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <div style={{ flex: 1 }}>{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 6px',
            fontSize: '12px',
            opacity: 0.8,
          }}
          aria-label="Dismiss message"
        >
          ✕
        </button>
      )}
    </div>
  );
}
