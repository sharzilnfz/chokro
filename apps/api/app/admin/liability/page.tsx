// Admin Liability & Exposure Dashboard (A11): Derived credit liability metrics, platform run-rate, solvency alerts, and dynamic cap configuration.
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminInput } from '../components/ui/AdminInput';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminResourceState } from '../components/ui/AdminResourceState';
import { useAdminNotice } from '../components/ui/AdminNotice';
import {
  useAdminLiability,
  useUpdateLiabilityCaps,
} from '../hooks/useAdminLiability';
import { formatDate, getErrorMessage } from '../lib/formatters';
import { DEFAULT_LIABILITY_CAPS, type UpdateLiabilityCapInput } from '@chokro/shared';

export default function AdminLiabilityPage() {
  const { data, isLoading, isError, refetch } = useAdminLiability();
  const updateCapsMutation = useUpdateLiabilityCaps();
  const { showNotice, clearNotice, noticeElement } = useAdminNotice();

  const [formState, setFormState] = useState<UpdateLiabilityCapInput>({
    monthlyPlatformCapBdt: DEFAULT_LIABILITY_CAPS.monthly_platform_cap_bdt,
    monthlyUserCapBdt: DEFAULT_LIABILITY_CAPS.monthly_user_cap_bdt,
    minRedemptionBdt: DEFAULT_LIABILITY_CAPS.min_redemption_bdt,
    feePercentage: DEFAULT_LIABILITY_CAPS.fee_percentage,
  });

  useEffect(() => {
    if (data?.activeCaps) {
      setFormState({
        monthlyPlatformCapBdt: Number(data.activeCaps.monthly_platform_cap_bdt),
        monthlyUserCapBdt: Number(data.activeCaps.monthly_user_cap_bdt),
        minRedemptionBdt: Number(data.activeCaps.min_redemption_bdt),
        feePercentage: Number(data.activeCaps.fee_percentage),
      });
    }
  }, [data?.activeCaps]);

  const summary = data?.summary;
  const history = data?.capsHistory || [];

  async function handleSaveCaps(e: FormEvent) {
    e.preventDefault();
    clearNotice();

    try {
      await updateCapsMutation.mutateAsync(formState);
      showNotice(
        'success',
        'Liability caps updated successfully. New limits and fee percentage are immediately effective.',
      );
    } catch (err) {
      showNotice('error', getErrorMessage(err, 'Failed to update liability caps.'));
    }
  }

  const runRatePercent = summary ? Math.round(summary.monthlyRunRateRatio * 100) : 0;

  return (
    <>
      <AdminPageHeader
        kicker="Treasury & Risk Management (A11)"
        title="Platform Liability & Solvency Controls"
        description="Monitor outstanding verified credit exposure, monthly redemption run-rates, and configure platform liability caps."
      />

      {noticeElement}

      {/* Solvency Alert Banner if run rate >= 80% */}
      {summary?.capAlertTriggered && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="text-sm font-extrabold text-amber-900">
                Monthly Liability Cap Threshold Alert ({runRatePercent}%)
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Current month redemptions (৳{summary.currentMonthRedeemedBdt.toFixed(2)}) have reached {runRatePercent}% of the platform cap (৳{summary.monthlyPlatformCapBdt.toFixed(2)}). Consider replenishing the liquidity pool or adjusting caps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Outstanding Liability */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-extrabold text-slate-500 tracking-wider uppercase">
            Outstanding Liability
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ৳{summary ? summary.outstandingLiabilityBdt.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Derived: Verified Earned ({summary?.totalEarnedVerifiedCredits.toFixed(0) || 0}) - Redeemed ({summary?.totalRedeemedCredits.toFixed(0) || 0})
          </div>
        </div>

        {/* Month-to-Date Redeemed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-extrabold text-slate-500 tracking-wider uppercase">
            Current Month Redeemed
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            ৳{summary ? summary.currentMonthRedeemedBdt.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {runRatePercent}% of monthly platform limit
          </div>
        </div>

        {/* Monthly Platform Cap */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-extrabold text-slate-500 tracking-wider uppercase">
            Monthly Platform Cap
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ৳{summary ? summary.monthlyPlatformCapBdt.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Hard stop on total monthly cash-outs
          </div>
        </div>

        {/* Remaining Monthly Allowance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-extrabold text-slate-500 tracking-wider uppercase">
            Remaining Pool
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ৳{summary ? summary.monthlyCapRemainingBdt.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Available before redemption pause
          </div>
        </div>
      </div>

      {/* Run Rate Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-extrabold text-slate-700">Monthly Run-Rate Progress</span>
          <span className="text-xs font-bold text-slate-600">
            ৳{summary ? summary.currentMonthRedeemedBdt.toFixed(2) : 0} / ৳{summary ? summary.monthlyPlatformCapBdt.toFixed(2) : 0} ({runRatePercent}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              runRatePercent >= 80 ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, runRatePercent))}%` }}
          />
        </div>
      </div>

      {/* Cap Configuration & History Grid */}
      <div className="admin-workspace-grid">
        {/* Form Panel */}
        <section className="admin-panel admin-form-panel" aria-labelledby="cap-config-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="cap-config-title">
                Active Liability Cap Configuration
              </h2>
              <p className="admin-section-copy">
                Updates take effect immediately and are recorded in the immutable audit log.
              </p>
            </div>
          </div>

          {isLoading ? (
            <AdminSkeleton rowCount={4} colCount={2} label="Loading cap configurations" />
          ) : (
            <form className="admin-form" onSubmit={handleSaveCaps}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminInput
                  id="platform-cap"
                  label="Monthly Platform Cap (BDT)"
                  type="number"
                  min="1000"
                  step="500"
                  value={String(formState.monthlyPlatformCapBdt)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      monthlyPlatformCapBdt: parseFloat(e.target.value) || 0,
                    })
                  }
                  hint="Maximum cumulative BDT value platform can disburse per calendar month."
                  required
                />

                <AdminInput
                  id="user-cap"
                  label="Monthly Per-User Cap (BDT)"
                  type="number"
                  min="100"
                  step="100"
                  value={String(formState.monthlyUserCapBdt)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      monthlyUserCapBdt: parseFloat(e.target.value) || 0,
                    })
                  }
                  hint="Maximum cash-out a single user can redeem in a calendar month."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminInput
                  id="min-redemption"
                  label="Minimum Redemption Amount (BDT)"
                  type="number"
                  min="10"
                  step="10"
                  value={String(formState.minRedemptionBdt)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      minRedemptionBdt: parseFloat(e.target.value) || 0,
                    })
                  }
                  hint="Minimum credits required to initiate a cash-out request."
                  required
                />

                <AdminInput
                  id="fee-percentage"
                  label="MFS Transfer Fee Percentage (%)"
                  type="number"
                  min="0"
                  max="10"
                  step="0.05"
                  value={String(formState.feePercentage)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      feePercentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  hint="Disclosed real-world MFS cash-out fee percentage (default 1.85%)."
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <AdminButton
                  variant="primary"
                  type="submit"
                  loading={updateCapsMutation.isPending}
                  loadingText="Saving caps..."
                >
                  Save Cap Changes
                </AdminButton>
              </div>
            </form>
          )}
        </section>

        {/* Cap History Panel */}
        <section className="admin-panel" aria-labelledby="cap-history-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="cap-history-title">
                Cap Configuration History
              </h2>
              <p className="admin-section-copy">
                Audit trail of liability cap and fee changes with actor IDs.
              </p>
            </div>
            {!isLoading && (
              <span className="admin-panel-count">
                {history.length} {history.length === 1 ? 'version' : 'versions'}
              </span>
            )}
          </div>

          <AdminResourceState
            isLoading={isLoading}
            // This panel intentionally has no error branch: a failed read falls back to defaults.
            isError={false}
            isEmpty={history.length === 0}
            onRetry={() => void refetch()}
            skeleton={<AdminSkeleton rowCount={4} colCount={5} label="Loading cap history" />}
            errorTitle="Audit history unavailable"
            errorCopy="Retry when the admin API is available."
            emptyTitle="Operating on default caps"
            emptyCopy="No custom cap revisions have been committed yet."
          >
            <div className="admin-table-wrap admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Version</th>
                    <th scope="col">Status</th>
                    <th scope="col">Effective From</th>
                    <th scope="col">Platform Cap</th>
                    <th scope="col">User Cap</th>
                    <th scope="col">Fee %</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, idx) => {
                    const isCurrent = idx === 0;
                    return (
                      <tr key={entry.id}>
                        <td data-label="Version">
                          <span className="font-mono text-xs text-slate-700">
                            {entry.id.slice(0, 8)}...
                          </span>
                        </td>
                        <td data-label="Status">
                          <AdminBadge status={isCurrent ? 'CURRENT' : 'HISTORICAL'}>
                            {isCurrent ? 'Active' : 'Superseded'}
                          </AdminBadge>
                        </td>
                        <td data-label="Effective From">{formatDate(entry.effective_from)}</td>
                        <td data-label="Platform Cap">
                          ৳{Number(entry.monthly_platform_cap_bdt).toFixed(0)}
                        </td>
                        <td data-label="User Cap">
                          ৳{Number(entry.monthly_user_cap_bdt).toFixed(0)}
                        </td>
                        <td data-label="Fee %">{entry.fee_percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminResourceState>
        </section>
      </div>
    </>
  );
}
