// Admin console page: Inter-campus Green Circularity Leaderboards & Snapshot Materialization.
'use client';

import { LEADERBOARD_PERIODS, type LeaderboardPeriod } from '@chokro/shared';
import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminResourceState } from '../components/ui/AdminResourceState';
import { useAdminNotice } from '../components/ui/AdminNotice';
import { useAdminLeaderboard, useRefreshLeaderboard } from '../hooks/useAdminLeaderboard';
import { formatLabel, getErrorMessage } from '../lib/formatters';

export default function AdminLeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('WEEKLY');
  const { showNotice, clearNotice, noticeElement } = useAdminNotice();

  const { data: rankings = [], isLoading, isError, refetch } = useAdminLeaderboard(period);
  const refreshMutation = useRefreshLeaderboard();

  async function handleMaterialize() {
    clearNotice();
    try {
      await refreshMutation.mutateAsync();
      showNotice(
        'success',
        'Campus leaderboards materialized successfully across Weekly, Monthly, and All-Time windows.',
      );
      void refetch();
    } catch (err) {
      showNotice('error', getErrorMessage(err, 'Failed to materialize campus leaderboards.'));
    }
  }

  return (
    <>
      <AdminPageHeader
        kicker="Engagement & Circularity"
        title="Campus Leaderboards"
        description="Inspect inter-campus rankings derived from verified recycling deposits with active streak multipliers."
        actions={
          <div className="admin-header-actions flex items-center gap-3">
            <div className="admin-filter-bar" role="group" aria-label="Leaderboard period filters">
              {LEADERBOARD_PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="admin-filter-button"
                  aria-pressed={period === p}
                  onClick={() => setPeriod(p)}
                >
                  {formatLabel(p)}
                </button>
              ))}
            </div>

            <AdminButton
              variant="primary"
              type="button"
              onClick={handleMaterialize}
              disabled={refreshMutation.isPending}
            >
              {refreshMutation.isPending ? 'Materializing...' : 'Rebuild Leaderboards'}
            </AdminButton>
          </div>
        }
      />

      {noticeElement}

      <section className="admin-panel" aria-labelledby="leaderboard-table-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="leaderboard-table-title">
              {formatLabel(period)} Rankings
            </h2>
            <p className="admin-section-copy">
              Materialized snapshot showing verified points accumulated per campus institution.
            </p>
          </div>
          {!isLoading && <span className="admin-panel-count">{rankings.length} campuses ranked</span>}
        </div>

        <AdminResourceState
          isLoading={isLoading}
          isError={isError && rankings.length === 0}
          isEmpty={rankings.length === 0}
          onRetry={() => void refetch()}
          skeleton={<AdminSkeleton rowCount={4} colCount={5} label="Loading campus rankings" />}
          errorTitle="Leaderboards unavailable"
          errorCopy="Failed to load campus rankings. Try refreshing or rebuilding snapshots."
          emptyTitle="No snapshot materialized yet"
          emptyCopy={
            <>
              Click &ldquo;Rebuild Leaderboards&rdquo; above to calculate scores from verified transactions.
            </>
          }
          emptyAction={
            <AdminButton variant="primary" type="button" onClick={handleMaterialize}>
              Rebuild Leaderboards Now
            </AdminButton>
          }
        >
          <div className="admin-table-wrap admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '80px' }}>Rank</th>
                  <th scope="col">Campus / Institution</th>
                  <th scope="col">Total Verified Points</th>
                  <th scope="col">Active Contributors</th>
                  <th scope="col">Snapshot Date</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <tr key={entry.id || entry.campus_id}>
                      <td data-label="Rank">
                        <span
                          className={`inline-flex items-center justify-center font-extrabold w-8 h-8 rounded-full text-xs ${
                            rank === 1
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : rank === 2
                              ? 'bg-slate-200 text-slate-800 border border-slate-300'
                              : rank === 3
                              ? 'bg-amber-700/20 text-amber-800 border border-amber-600/30'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          #{rank}
                        </span>
                      </td>
                      <td data-label="Campus / Institution">
                        <span className="admin-cell-primary font-bold">{entry.campus_id}</span>
                      </td>
                      <td data-label="Total Verified Points">
                        <span className="font-mono font-semibold text-emerald-800 text-base">
                          {Number(entry.total_points).toFixed(2)} pts
                        </span>
                      </td>
                      <td data-label="Active Contributors">
                        <AdminBadge status="ACTIVE">{entry.member_count} members</AdminBadge>
                      </td>
                      <td data-label="Snapshot Date">
                        <span className="text-xs text-slate-600">{entry.snapshot_date}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminResourceState>
      </section>
    </>
  );
}
