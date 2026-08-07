type AdminSkeletonProps = {
  rowCount?: number;
  colCount?: number;
  label?: string;
};

export function AdminSkeleton({
  rowCount = 4,
  colCount = 5,
  label = 'Loading data',
}: AdminSkeletonProps) {
  return (
    <div className="admin-skeleton-list" role="status" aria-label={label}>
      {Array.from({ length: rowCount }).map((_, row) => (
        <div className="admin-skeleton-row" key={row} aria-hidden="true">
          {Array.from({ length: colCount }).map((_, column) => (
            <span className="admin-skeleton-line" key={column} />
          ))}
        </div>
      ))}
    </div>
  );
}
