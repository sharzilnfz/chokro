import type { ReactNode } from 'react';

export type NoticeTone = 'success' | 'error';

type AdminStatusMessageProps = {
  tone?: NoticeTone;
  children: ReactNode;
};

export function AdminStatusMessage({ tone = 'success', children }: AdminStatusMessageProps) {
  if (!children) return null;

  return (
    <p
      className="admin-status-message"
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}
