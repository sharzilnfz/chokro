import type { ReactNode } from 'react';

type AdminBadgeProps = {
  status?: string;
  children: ReactNode;
};

export function AdminBadge({ status, children }: AdminBadgeProps) {
  return (
    <span className="admin-badge" data-status={status}>
      {children}
    </span>
  );
}
