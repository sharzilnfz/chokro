import type { ReactNode } from 'react';
import { cx } from '../../lib/formatters';

export type AdminBadgeProps = {
  status?: string;
  children: ReactNode;
  className?: string;
};

export function AdminBadge({ status, children, className = '' }: AdminBadgeProps) {
  return (
    <span
      className={cx('admin-badge', className)}
      data-status={status}
      role="status"
    >
      {children}
    </span>
  );
}
