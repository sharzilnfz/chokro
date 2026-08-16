// Consistent page header for admin screens: kicker, title, description, and optional action area.
import type { ReactNode } from 'react';
import { cx } from '../../lib/formatters';

// Header slot props; actions is reserved for page-level controls like filters.
export type AdminPageHeaderProps = {
  kicker: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  className?: string;
};

// Lays out the text block and renders page actions beside it when provided.
export function AdminPageHeader({
  kicker,
  title,
  description,
  actions,
  className = '',
}: AdminPageHeaderProps) {
  return (
    // Heading text followed by the optional actions slot
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
