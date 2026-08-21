// Admin Redemptions Queue & MFS Settlement Worklist (A10): View, filter, approve, reject, or retry user cash-out redemptions.
'use client';

import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminSelect } from '../components/ui/AdminSelect';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminResourceState } from '../components/ui/AdminResourceState';
import { useAdminNotice } from '../components/ui/AdminNotice';
import { AdminConfirmModal } from '../components/ui/AdminConfirmModal';
import {
  useAdminRedemptions,
  useSettleRedemption,
} from '../hooks/useAdminRedemptions';
import { formatDate, getErrorMessage } from '../lib/formatters';
import type { RedemptionRequestRecord, RedemptionStatus } from '@chokro/shared';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ESCALATED', label: 'Escalated (Needs Review)' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'AUTO_APPROVED', label: 'Auto Approved' },
  { value: 'PAID', label: 'Paid (Settled)' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function AdminRedemptionsPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { showNotice, clearNotice, noticeElement } = useAdminNotice();

  const { data, isLoading, isError, refetch } = useAdminRedemptions(statusFilter);
  const settleMutation = useSettleRedemption();

  const [activeAction, setActiveAction] = useState<{
    redemption: RedemptionRequestRecord;
    action: 'APPROVE' | 'REJECT' | 'RETRY';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');

  const redemptions = data?.redemptions || [];

  async function handleConfirmAction() {
    if (!activeAction) return;

    try {
      await settleMutation.mutateAsync({
        id: activeAction.redemption.id,
        payload: {
          action: activeAction.action,
          reason: actionReason || undefined,
        },
      });

      showNotice(
        'success',
        `Redemption ${activeAction.redemption.id.slice(0, 8)}... ${
          activeAction.action === 'APPROVE'
            ? 'approved and payout disbursed'
            : activeAction.action === 'REJECT'
              ? 'rejected and credits restored'
              : 'retry attempted'
        } successfully.`,
      );

      setActiveAction(null);
      setActionReason('');
    } catch (err) {
      showNotice(
        'error',
        getErrorMessage(err, `Failed to ${activeAction.action.toLowerCase()} redemption`),
      );
    }
  }

  return (
    <>
      <AdminPageHeader
        kicker="Treasury & Settlement (A10)"
        title="Green Wallet Redemption Queue"
        description="Monitor user cash-out requests, audit Trust Gate verification decisions, and manage MFS payout disbursements."
      />

      {noticeElement}

      <div className="admin-panel mb-6">
        <div className="admin-panel-header">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="status-filter" className="text-sm font-semibold text-slate-700">
              Filter by status:
            </label>
            <div className="w-64">
              <AdminSelect
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={STATUS_FILTERS}
              />
            </div>
          </div>
          {!isLoading && (
            <span className="admin-panel-count">
              {redemptions.length} {redemptions.length === 1 ? 'request' : 'requests'}
            </span>
          )}
        </div>

        <AdminResourceState
          isLoading={isLoading}
          isError={isError}
          isEmpty={redemptions.length === 0}
          onRetry={() => void refetch()}
          skeleton={<AdminSkeleton rowCount={6} colCount={7} label="Loading redemptions queue" />}
          errorTitle="Redemptions queue unavailable"
          errorCopy="Check server logs or retry when the API is online."
          emptyTitle="No redemptions found"
          emptyCopy={
            statusFilter !== 'ALL'
              ? `No redemption requests match status "${statusFilter}".`
              : 'No user cash-out requests have been recorded yet.'
          }
        >
          <div className="admin-table-wrap admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Credits (Gross)</th>
                  <th scope="col">Fee / Net (BDT)</th>
                  <th scope="col">Payout Target</th>
                  <th scope="col">Trust Gate</th>
                  <th scope="col">Status</th>
                  <th scope="col">Gateway Ref</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((item) => {
                  const gross = Number(item.gross_amount_bdt);
                  const fee = Number(item.fee_bdt);
                  const net = Number(item.net_amount_bdt);
                  const decision = item.trust_decision;
                  const payout = item.payout;

                  return (
                    <tr key={item.id}>
                      <td data-label="User">
                        <div className="font-semibold text-slate-900">{item.user?.email || 'User'}</div>
                        <div className="text-xs text-slate-500">{formatDate(item.created_at)}</div>
                      </td>

                      <td data-label="Credits">
                        <span className="font-bold text-slate-900">৳{gross.toFixed(2)}</span>
                        <span className="text-xs text-slate-500 block">{item.amount_credits} credits</span>
                      </td>

                      <td data-label="Fee / Net">
                        <div className="font-black text-emerald-700">৳{net.toFixed(2)}</div>
                        <div className="text-xs text-rose-500">- ৳{fee.toFixed(2)} fee</div>
                      </td>

                      <td data-label="Payout Target">
                        <span className="font-bold text-slate-800">{item.payout_channel}</span>
                        <span className="text-xs font-mono text-slate-600 block">{item.account_number}</span>
                      </td>

                      <td data-label="Trust Gate">
                        {decision ? (
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] font-black rounded ${
                                decision.decision === 'AUTO_CLEAR'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {decision.decision}
                            </span>
                            {decision.failing_signals && decision.failing_signals.length > 0 && (
                              <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                {decision.failing_signals.join(', ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td data-label="Status">
                        <AdminBadge status={item.status}>{item.status}</AdminBadge>
                      </td>

                      <td data-label="Gateway Ref">
                        {payout?.gateway_ref ? (
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {payout.gateway_ref}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {payout.status === 'SIMULATED' ? 'Offline Simulated' : payout.gateway_provider}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </td>

                      <td data-label="Actions">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.status === 'ESCALATED' || item.status === 'REQUESTED') && (
                            <>
                              <AdminButton
                                variant="primary"
                                type="button"
                                onClick={() => setActiveAction({ redemption: item, action: 'APPROVE' })}
                              >
                                Approve & Pay
                              </AdminButton>
                              <AdminButton
                                variant="danger"
                                type="button"
                                onClick={() => setActiveAction({ redemption: item, action: 'REJECT' })}
                              >
                                Reject
                              </AdminButton>
                            </>
                          )}

                          {item.status === 'FAILED' && (
                            <AdminButton
                              variant="secondary"
                              type="button"
                              onClick={() => setActiveAction({ redemption: item, action: 'RETRY' })}
                            >
                              Retry Payout
                            </AdminButton>
                          )}

                          {item.status === 'PAID' && (
                            <span className="text-xs text-emerald-600 font-bold">✓ Settled</span>
                          )}

                          {item.status === 'CANCELLED' && (
                            <span className="text-xs text-slate-400">Cancelled by user</span>
                          )}

                          {item.status === 'REJECTED' && (
                            <span className="text-xs text-rose-500">Rejected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminResourceState>
      </div>

      {/* Confirmation Modal */}
      {activeAction && (
        <AdminConfirmModal
          isOpen={Boolean(activeAction)}
          title={`${activeAction.action === 'APPROVE' ? 'Approve & Disburse' : activeAction.action === 'REJECT' ? 'Reject Cash-Out' : 'Retry'} Redemption`}
          description={
            activeAction.action === 'APPROVE'
              ? `Are you sure you want to approve redemption ${activeAction.redemption.id.slice(0, 8)}... and disburse ৳${Number(activeAction.redemption.net_amount_bdt).toFixed(2)} to ${activeAction.redemption.payout_channel} (${activeAction.redemption.account_number})?`
              : activeAction.action === 'REJECT'
                ? `Rejecting this request will restore ৳${Number(activeAction.redemption.gross_amount_bdt).toFixed(2)} to the user's verified balance via a compensating ledger entry.`
                : `Retry MFS payout for redemption ${activeAction.redemption.id.slice(0, 8)}...?`
          }
          confirmLabel={
            activeAction.action === 'APPROVE'
              ? 'Confirm & Disburse'
              : activeAction.action === 'REJECT'
                ? 'Reject Request'
                : 'Retry Transfer'
          }
          confirmVariant={activeAction.action === 'REJECT' ? 'danger' : 'primary'}
          onConfirm={handleConfirmAction}
          onCancel={() => {
            setActiveAction(null);
            setActionReason('');
          }}
          loading={settleMutation.isPending}
        />
      )}
    </>
  );
}
