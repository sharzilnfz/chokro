export type AdminSkeletonProps = {
  rowCount?: number;
  colCount?: number;
  label?: string;
  className?: string;
};

export function AdminSkeleton({
  rowCount = 4,
  colCount = 5,
  label = 'Loading data...',
  className = '',
}: AdminSkeletonProps) {
  return (
    <div
      className={['admin-skeleton-list', className].filter(Boolean).join(' ')}
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
