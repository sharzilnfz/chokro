import type { ReactNode } from 'react';

export type AdminBadgeProps = {
  status?: string;
  children: ReactNode;
  className?: string;
};

export function AdminBadge({ status, children, className = '' }: AdminBadgeProps) {
  return (
    <span
      className={['admin-badge', className].filter(Boolean).join(' ')}
      data-status={status}
      role="status"
    >
      {children}
    </span>
  );
}
