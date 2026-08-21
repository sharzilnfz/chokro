// Admin Escalation Worklist (A07): Review escalated verification bundles, inspect failing signals, and adjudicate decisions.
'use client';

import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminConfirmModal } from '../components/ui/AdminConfirmModal';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminResourceState } from '../components/ui/AdminResourceState';
import { useAdminNotice } from '../components/ui/AdminNotice';
import {
  useAdminEscalations,
  useAdjudicateDecision,
} from '../hooks/useAdminEscalations';
import { formatDate, getErrorMessage } from '../lib/formatters';
import type { EscalationWorklistItemDto as EscalationWorklistItem } from '@chokro/shared';

interface PendingAdjudication {
  item: EscalationWorklistItem;
  action: 'VERIFY' | 'REJECT';
}

export default function AdminTrustGateEscalationsPage() {
  const { data, isLoading, isError, refetch } = useAdminEscalations();
  const adjudicateMutation = useAdjudicateDecision();
  const { showNotice, clearNotice, noticeElement } = useAdminNotice();

  const [selectedItem, setSelectedItem] = useState<EscalationWorklistItem | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAdjudication | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const escalations = data?.escalations || [];

  async function handleExecuteAdjudication() {
    if (!pendingAction) return;

    const { item, action } = pendingAction;
    if (action === 'REJECT' && !rejectionReason.trim()) {
      showNotice('error', 'A rejection reason is required to explain the decision to the user.');
      return;
    }

    clearNotice();

    try {
      await adjudicateMutation.mutateAsync({
        id: item.id,
        payload: {
          action,
          reason: action === 'REJECT' ? rejectionReason : undefined,
        },
      });

      showNotice(
        'success',
        `Decision ${item.id.slice(0, 8)}... successfully adjudicated as ${action}.`,
      );

      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
    } catch (err) {
      showNotice('error', getErrorMessage(err, 'Failed to adjudicate decision.'));
    } finally {
      setPendingAction(null);
      setRejectionReason('');
    }
  }

  return (
    <>
      <AdminPageHeader
        kicker="Trust Gate & Fraud Surface (A07)"
        title="Admin Escalation Worklist"
        description="Review escalated verification bundles, inspect failing trust signals and fraud flag histories, and adjudicate decisions (oldest first)."
      />

      {noticeElement}

      <div className="admin-workspace-grid">
        {/* Escalations Queue List */}
        <section className="admin-panel" aria-labelledby="escalation-queue-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="escalation-queue-title">
                Escalated Verification Queue
              </h2>
              <p className="admin-section-copy">
                Items requiring human adjudication. Contested items are flagged as second-look reviews.
              </p>
            </div>
            {!isLoading && (
              <span className="admin-panel-count">
                {escalations.length} {escalations.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>

          <AdminResourceState
            isLoading={isLoading}
            isError={isError}
            isEmpty={escalations.length === 0}
            onRetry={() => void refetch()}
            skeleton={<AdminSkeleton rowCount={5} colCount={4} label="Loading escalation worklist" />}
            errorTitle="Escalation queue unavailable"
            errorCopy="Failed to load escalated decisions from the trust gate."
            emptyTitle="Queue is clear"
            emptyCopy="All trust decisions are auto-cleared or have been adjudicated."
          >
            <div className="admin-table-wrap admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Decision / Subject</th>
                    <th scope="col">Type</th>
                    <th scope="col">Failing Signals</th>
                    <th scope="col">Appeals & Flags</th>
                    <th scope="col">Escalated At</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {escalations.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        className={isSelected ? 'bg-slate-50' : undefined}
                        onClick={() => setSelectedItem(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td data-label="Decision / Subject">
                          <div className="font-mono text-xs text-slate-800 font-bold">
                            {item.id.slice(0, 8)}...
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {item.subject?.category || 'General'} · {item.subject?.declared_quantity ?? '—'}{' '}
                            {item.subject?.unit || 'kg'}
                          </div>
                        </td>
                        <td data-label="Type">
                          <AdminBadge status={item.subject_type}>
                            {item.subject_type}
                          </AdminBadge>
                        </td>
                        <td data-label="Failing Signals">
                          <div className="flex flex-wrap gap-1">
                            {item.failing_signals.map((sig) => (
                              <span
                                key={sig}
                                className="inline-block px-1.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800 rounded"
                              >
                                {sig}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td data-label="Appeals & Flags">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.is_contested && (
                              <span className="inline-block px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                                Contested (2nd Look)
                              </span>
                            )}
                            {(item.user_flags?.length ?? 0) > 0 && (
                              <span className="inline-block px-1.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded">
                                {item.user_flags!.length} user flag(s)
                              </span>
                            )}
                            {(item.partner_flags?.length ?? 0) > 0 && (
                              <span className="inline-block px-1.5 py-0.5 text-xs font-semibold bg-orange-50 text-orange-700 rounded">
                                {item.partner_flags!.length} partner flag(s)
                              </span>
                            )}
                          </div>
                        </td>
                        <td data-label="Escalated At" className="text-xs text-slate-600">
                          {formatDate(String(item.created_at))}
                        </td>
                        <td data-label="Actions" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <AdminButton
                              variant="primary"
                              onClick={() => setPendingAction({ item, action: 'VERIFY' })}
                            >
                              Verify
                            </AdminButton>
                            <AdminButton
                              variant="secondary"
                              onClick={() => setPendingAction({ item, action: 'REJECT' })}
                            >
                              Reject
                            </AdminButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminResourceState>
        </section>

        {/* Selected Item Detail Inspector */}
        <section className="admin-panel" aria-labelledby="detail-inspector-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="detail-inspector-title">
                Evidence & Signal Inspector
              </h2>
              <p className="admin-section-copy">
                Detailed evidence photo, signal values, and fraud flag audit logs.
              </p>
            </div>
          </div>

          {selectedItem ? (
            <div className="space-y-6">
              {/* Contested banner */}
              {selectedItem.is_contested && selectedItem.contest && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="font-bold text-amber-900 text-sm">
                    User Appeal (Second-Look Review)
                  </div>
                  <div className="text-xs text-amber-800 mt-1">
                    &ldquo;{selectedItem.contest.reason}&rdquo;
                  </div>
                  <div className="text-[11px] text-amber-700 mt-1">
                    Submitted on {formatDate(String(selectedItem.contest.created_at))}
                  </div>
                </div>
              )}

              {/* Subject Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Subject ID:</span>
                  <p className="font-mono text-slate-800">{selectedItem.subject_id}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Category:</span>
                  <p className="font-semibold text-slate-800">{selectedItem.subject?.category || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Declared Quantity:</span>
                  <p className="text-slate-800">{selectedItem.subject?.declared_quantity ?? '—'} {selectedItem.subject?.unit || ''}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Verified Quantity:</span>
                  <p className="text-slate-800">{selectedItem.subject?.verified_quantity ?? '—'} {selectedItem.subject?.unit || ''}</p>
                </div>
              </div>

              {/* Evidence Photo */}
              {selectedItem.subject?.evidence_url ? (
                <div>
                  <span className="text-xs text-slate-500 font-medium block mb-2">Evidence Photo:</span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 bg-slate-100 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedItem.subject.evidence_url}
                      alt="Deposit / Pickup Evidence"
                      className="max-h-60 object-contain"
                    />
                  </div>
                </div>
              ) : null}

              {/* Failing Signals */}
              <div>
                <span className="text-xs text-slate-500 font-medium block mb-2">Failing Checks:</span>
                <div className="space-y-2">
                  {selectedItem.failing_signals.map((sig) => {
                    const evaluated = selectedItem.evaluated_signals?.[sig];
                    return (
                      <div key={sig} className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs">
                        <div className="font-bold text-rose-900">{sig}</div>
                        {evaluated?.reason && (
                          <div className="text-rose-700 mt-0.5">{evaluated.reason}</div>
                        )}
                        {evaluated?.value && (
                          <pre className="mt-1 text-[11px] text-slate-700 bg-white/70 p-1.5 rounded font-mono overflow-x-auto">
                            {JSON.stringify(evaluated.value, null, 2)}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fraud Flags History */}
              {((selectedItem.user_flags?.length ?? 0) > 0 || (selectedItem.partner_flags?.length ?? 0) > 0) && (
                <div>
                  <span className="text-xs text-slate-500 font-medium block mb-2">Fraud Flag History:</span>
                  <div className="space-y-1.5 text-xs">
                    {selectedItem.user_flags?.map((f) => (
                      <div key={f.id} className="p-2 bg-slate-50 border border-slate-200 rounded">
                        <span className="font-semibold text-slate-700">[USER] {f.flag_type} ({f.severity}): </span>
                        <span className="text-slate-600">{f.reason}</span>
                      </div>
                    ))}
                    {selectedItem.partner_flags?.map((f) => (
                      <div key={f.id} className="p-2 bg-slate-50 border border-slate-200 rounded">
                        <span className="font-semibold text-slate-700">[PARTNER] {f.flag_type} ({f.severity}): </span>
                        <span className="text-slate-600">{f.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adjudication actions in detail */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <AdminButton
                  variant="primary"
                  onClick={() => setPendingAction({ item: selectedItem, action: 'VERIFY' })}
                >
                  Verify & Mint Credits
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  onClick={() => setPendingAction({ item: selectedItem, action: 'REJECT' })}
                >
                  Reject with Reason
                </AdminButton>
              </div>
            </div>
          ) : (
            <div className="admin-state">
              <div className="admin-state-content">
                <p className="admin-state-copy">Select an escalated item from the table to inspect details.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Confirmation / Rejection Modal */}
      {pendingAction && (
        <AdminConfirmModal
          isOpen={true}
          title={pendingAction.action === 'VERIFY' ? 'Confirm Verification' : 'Reject Trust Decision'}
          description={
            pendingAction.action === 'VERIFY' ? (
              `Are you sure you want to verify decision ${pendingAction.item.id.slice(0, 8)}...? This will flip pending credits to VERIFIED and update the subject.`
            ) : (
              <>
                <p>
                  Provide an explanation reason for the rejection. This reason will be visible to the user and recorded in the audit log.
                </p>
                <div className="mt-4">
                  <label htmlFor="rejection-reason-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandatory Rejection Reason *
                  </label>
                  <textarea
                    id="rejection-reason-input"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    rows={3}
                    placeholder="Explain why this deposit or pickup was rejected (e.g. invalid photo, wrong category)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
              </>
            )
          }
          confirmLabel={pendingAction.action === 'VERIFY' ? 'Verify Decision' : 'Reject Decision'}
          confirmVariant={pendingAction.action === 'VERIFY' ? 'primary' : 'danger'}
          onCancel={() => {
            setPendingAction(null);
            setRejectionReason('');
          }}
          onConfirm={handleExecuteAdjudication}
        />
      )}
    </>
  );
}
