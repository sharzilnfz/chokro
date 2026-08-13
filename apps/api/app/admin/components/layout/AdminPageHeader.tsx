import type { ReactNode } from 'react';
import { cx } from '../../lib/formatters';

export type AdminPageHeaderProps = {
  kicker: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function AdminPageHeader({
  kicker,
  title,
  description,
  actions,
  className = '',
}: AdminPageHeaderProps) {
  return (
    <header className={cx('admin-page-header', className)}>
      <div>
        <p className="admin-page-kicker">{kicker}</p>
        <h1 className="admin-page-title">{title}</h1>
        <p className="admin-page-description">{description}</p>
      </div>
      {actions && <div className="admin-page-header-actions">{actions}</div>}
    </header>
  );
}
