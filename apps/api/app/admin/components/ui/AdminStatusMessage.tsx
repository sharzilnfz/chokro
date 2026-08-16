// Dismissible status/alerts banner that adapts its tone, ARIA role, and live region to the message type.
import type { ReactNode } from 'react';
import { cx } from '../../lib/formatters';

// Visual and semantic tone for the message; error is announced assertively.
export type NoticeTone = 'success' | 'error' | 'warning' | 'info';

export type AdminStatusMessageProps = {
  tone?: NoticeTone;
  children: ReactNode;
  className?: string;
  onDismiss?: () => void;
};

// Renders nothing when empty; otherwise the tone-styled message plus an opt-in dismiss button.
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
