// Composition scaffold for admin resource panels (deepening C10): owns the loading,
// error, and empty states so pages only supply columns, forms, and row actions.
'use client';

import type { ReactNode } from 'react';
import { AdminButton } from './AdminButton';
import { AdminSkeleton } from './AdminSkeleton';

export type AdminResourceStateProps = {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  // Query refetcher invoked by the Retry button in the error state.
  onRetry?: () => void;
  // Custom loading placeholder; defaults to a five-row skeleton.
  skeleton?: ReactNode;
  errorTitle: string;
  errorCopy: string;
  emptyTitle: string;
  emptyCopy: ReactNode;
  // Optional call-to-action rendered inside the empty state.
  emptyAction?: ReactNode;
  // The data view (usually the table) rendered once rows exist.
  children: ReactNode;
};

// Branches the panel across load / error / empty / data states using the shared admin-state blocks.
export function AdminResourceState({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  skeleton,
  errorTitle,
  errorCopy,
  emptyTitle,
  emptyCopy,
  emptyAction,
  children,
}: AdminResourceStateProps) {
  if (isLoading) {
    return skeleton ?? <AdminSkeleton rowCount={5} />;
  }

  if (isError) {
    return (
      <div className="admin-state">
        <div className="admin-state-content">
          <h3 className="admin-state-title">{errorTitle}</h3>
          <p className="admin-state-copy">{errorCopy}</p>
          {onRetry && (
            <AdminButton variant="secondary" type="button" onClick={onRetry}>
              Retry
            </AdminButton>
          )}
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="admin-state">
        <div className="admin-state-content">
          <h3 className="admin-state-title">{emptyTitle}</h3>
          <p className="admin-state-copy">{emptyCopy}</p>
          {emptyAction}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
