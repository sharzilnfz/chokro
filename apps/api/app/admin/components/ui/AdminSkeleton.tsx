// Accessible loading placeholder that mimics a data table of rowCount × colCount cell lines.
import { cx } from '../../lib/formatters';

export type AdminSkeletonProps = {
  rowCount?: number;
  colCount?: number;
  label?: string;
  className?: string;
};

// Generates the shimmer rows and exposes a screen-reader-only label while marking the region busy.
export function AdminSkeleton({
  rowCount = 4,
  colCount = 5,
  label = 'Loading data...',
  className = '',
}: AdminSkeletonProps) {
  return (
    <div
      className={cx('admin-skeleton-list', className)}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      {Array.from({ length: rowCount }).map((_, row) => (
        <div className="admin-skeleton-row" key={row} aria-hidden="true">
          {Array.from({ length: colCount }).map((_, column) => (
            <span className="admin-skeleton-line" key={column} />
          ))}
        </div>
      ))}
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        {label}
      </span>
    </div>
  );
}
