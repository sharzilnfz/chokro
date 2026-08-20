// Compact status chip that carries a data-attribute for tone theming and announces with role="status".
import type { ReactNode } from 'react';
import { cx } from '../../lib/formatters';

// Badge props: optional status token drives styling, children are the visible label.
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
