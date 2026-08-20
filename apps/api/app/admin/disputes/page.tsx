// Admin Unified Dispute Arbitration Queue (A09): Review photographic evidence, arbitrate between counterparties, and execute binding settlements.
'use client';

import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminInput } from '../components/ui/AdminInput';
import { AdminSelect } from '../components/ui/AdminSelect';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage, type NoticeTone } from '../components/ui/AdminStatusMessage';
import { useAdminDisputes, useResolveDispute } from '../hooks/useAdminDisputes';
import { formatDate, formatLabel, getErrorMessage } from '../lib/formatters';
import type { DisputeDto, DisputeResolution } from '@chokro/shared';

const STATUS_FILTERS = ['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const RESOLUTION_OPTIONS = [
  { value: 'BUYER_FAVORED', label: 'Buyer Favored (Full Refund / Return)' },
  { value: 'SELLER_FAVORED', label: 'Seller Favored (Full Release to Seller)' },
  { value: 'PARTIAL_RELEASE', label: 'Partial Release (Proportionate Split)' },
  { value: 'SPLIT', label: '50/50 Split Settlement' },
  { value: 'DISMISSED', label: 'Dismiss Dispute' },
];

type Notice = { tone: NoticeTone; text: string } | null;

export default function AdminDisputesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('ALL');
  const [selectedDispute, setSelectedDispute] = useState<DisputeDto | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  // Resolution form state
  const [resolution, setResolution] = useState<DisputeResolution>('BUYER_FAVORED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [buyerAmountBdt, setBuyerAmountBdt] = useState('');
  const [sellerAmountBdt, setSellerAmountBdt] = useState('');

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useAdminDisputes({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    sourceType: sourceTypeFilter === 'ALL' ? undefined : sourceTypeFilter,
  });

  const resolveMutation = useResolveDispute();

  const disputes = data?.disputes || [];

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDispute) return;
    setNotice(null);

    if (!resolutionNotes || resolutionNotes.trim().length < 3) {
      setNotice({ tone: 'error', text: 'Resolution reasoning notes are mandatory.' });
      return;
    }

    try {
      await resolveMutation.mutateAsync({
        id: selectedDispute.id,
        payload: {
          resolution,
          resolutionNotes: resolutionNotes.trim(),
          buyerAmountBdt: buyerAmountBdt ? parseFloat(buyerAmountBdt) : undefined,
          sellerAmountBdt: sellerAmountBdt ? parseFloat(sellerAmountBdt) : undefined,
        },
      });

      setNotice({
        tone: 'success',
        text: `Dispute #${selectedDispute.id.slice(0, 8)} resolved successfully as ${resolution}.`,
      });
      setSelectedDispute(null);
      setResolutionNotes('');
      setBuyerAmountBdt('');
      setSellerAmountBdt('');
      void refetch();
    } catch (err) {
      setNotice({
        tone: 'error',
        text: getErrorMessage(err, 'Failed to resolve dispute.'),
      });
    }
  }

  return (
    <>
      <AdminPageHeader
        kicker="Arbitration & Settlement (A09)"
        title="Unified Dispute Arbitration Queue"
        description="Review contested pickups, deposit discrepancies, and B2B auction lot quality issues. Adjudicate binding settlements and proportionate releases."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="admin-filter-bar" role="group" aria-label="Filter disputes by status">
              {STATUS_FILTERS.map((value) => (
                <button
                  className="admin-filter-button"
                  type="button"
                  key={value}
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                >
                  {formatLabel(value)}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {notice && (
        <AdminStatusMessage tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminStatusMessage>
      )}

      <div className="admin-workspace-grid">
        {/* Dispute List Panel */}
        <section className="admin-panel" aria-labelledby="disputes-list-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="disputes-list-title">
                Active Arbitration Cases
              </h2>
              <p className="admin-section-copy">
                Select a dispute case to review evidence and issue a binding resolution.
              </p>
            </div>
            {!isLoading && (
              <span className="admin-panel-count">
                {disputes.length} {disputes.length === 1 ? 'case' : 'cases'}
              </span>
            )}
          </div>

          {isLoading ? (
            <AdminSkeleton rowCount={5} colCount={4} label="Loading disputes" />
          ) : isError ? (
            <div className="admin-state">
              <div className="admin-state-content">
                <h3 className="admin-state-title">Failed to load disputes</h3>
                <p className="admin-state-copy">Please retry when API is reachable.</p>
                <AdminButton variant="secondary" type="button" onClick={() => void refetch()}>
                  Retry
                </AdminButton>
              </div>
            </div>
          ) : disputes.length === 0 ? (
            <div className="admin-state">
              <div className="admin-state-content">
                <h3 className="admin-state-title">No disputes found</h3>
                <p className="admin-state-copy">There are currently no active disputes matching the filter.</p>
              </div>
            </div>
          ) : (
            <div className="admin-table-wrap admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Case ID</th>
                    <th scope="col">Category</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Status</th>
                    <th scope="col">Date</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((item) => {
                    const isSelected = selectedDispute?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        className={isSelected ? 'bg-slate-50 font-medium' : ''}
                      >
                        <td data-label="Case ID">
                          <span className="font-mono text-xs text-slate-700">
                            #{item.id.slice(0, 8)}
                          </span>
                        </td>
                        <td data-label="Category">
                          <AdminBadge status={item.source_type}>
                            {item.source_type}
                          </AdminBadge>
                        </td>
                        <td data-label="Reason" className="max-w-[240px] truncate">
                          {item.reason}
                        </td>
                        <td data-label="Status">
                          <AdminBadge status={item.status}>
                            {item.status}
                          </AdminBadge>
                        </td>
                        <td data-label="Date">{formatDate(item.created_at)}</td>
                        <td data-label="Action">
                          <AdminButton
                            variant={isSelected ? 'primary' : 'secondary'}
                            size="sm"
                            type="button"
                            onClick={() => setSelectedDispute(item)}
                          >
                            {isSelected ? 'Viewing' : 'Review'}
                          </AdminButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Detail / Arbitration Panel */}
        <section className="admin-panel admin-form-panel" aria-labelledby="dispute-detail-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="dispute-detail-title">
                Arbitration Case Details
              </h2>
              <p className="admin-section-copy">
                {selectedDispute
                  ? `Case #${selectedDispute.id.slice(0, 8)} (${selectedDispute.source_type})`
                  : 'Select a case from the queue to arbitrate.'}
              </p>
            </div>
          </div>

          {!selectedDispute ? (
            <div className="admin-state">
              <div className="admin-state-content">
                <p className="admin-state-copy">
                  Select a dispute on the left to examine evidence and execute arbitration.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500 font-medium">Source Type:</span>{' '}
                    <span className="font-semibold text-slate-800">{selectedDispute.source_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Source ID:</span>{' '}
                    <span className="font-mono text-xs text-slate-800">{selectedDispute.source_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Opened By:</span>{' '}
                    <span className="font-mono text-xs text-slate-800">{selectedDispute.opened_by}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Against User:</span>{' '}
                    <span className="font-mono text-xs text-slate-800">{selectedDispute.against_user_id}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block mb-1">Reason:</span>
                  <p className="text-slate-900 font-medium bg-white p-3 rounded border border-slate-200 text-sm">
                    {selectedDispute.reason}
                  </p>
                </div>

                {selectedDispute.evidence_urls && selectedDispute.evidence_urls.length > 0 && (
                  <div>
                    <span className="text-slate-500 font-medium block mb-1">Photographic Evidence:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedDispute.evidence_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 text-blue-600 font-mono"
                        >
                          Attachment #{idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resolution Form or Result */}
              {selectedDispute.status === 'RESOLVED' || selectedDispute.status === 'CLOSED' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <h3 className="text-emerald-900 font-bold text-sm mb-1">
                    Resolved: {selectedDispute.resolution}
                  </h3>
                  <p className="text-emerald-800 text-sm italic mb-2">
                    "{selectedDispute.resolution_notes}"
                  </p>
                  <p className="text-xs text-emerald-700">
                    Resolved at {formatDate(selectedDispute.resolved_at)} by admin {selectedDispute.resolved_by?.slice(0, 8)}
                  </p>
                </div>
              ) : (
                <form className="admin-form" onSubmit={handleResolve}>
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                    Execute Arbitration Resolution
                  </h3>

                  <AdminSelect
                    id="resolution-select"
                    label="Arbitration Resolution"
                    value={resolution}
                    options={RESOLUTION_OPTIONS}
                    onChange={(e) => setResolution(e.target.value as DisputeResolution)}
                    hint="Binding judgment determining fund movement and state transitions."
                    required
                  />

                  {resolution === 'PARTIAL_RELEASE' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AdminInput
                        id="buyer-amount"
                        label="Buyer Refund Amount (BDT)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={buyerAmountBdt}
                        onChange={(e) => setBuyerAmountBdt(e.target.value)}
                        placeholder="e.g. 2500.00"
                        hint="Amount returned to buyer."
                        required
                      />
                      <AdminInput
                        id="seller-amount"
                        label="Seller Release Amount (BDT)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={sellerAmountBdt}
                        onChange={(e) => setSellerAmountBdt(e.target.value)}
                        placeholder="e.g. 7500.00"
                        hint="Amount released to seller."
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label htmlFor="resolution-notes" className="admin-form-label">
                      Resolution Reasoning & Findings
                    </label>
                    <textarea
                      id="resolution-notes"
                      rows={4}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Explain findings, visual assessment, and rationale for both parties..."
                      className="admin-input font-normal text-sm w-full p-2.5 border border-slate-300 rounded"
                      required
                    />
                    <p className="admin-form-hint">
                      This explanation will be permanently recorded and sent to both counterparties.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                    <AdminButton
                      variant="primary"
                      type="submit"
                      loading={resolveMutation.isPending}
                      loadingText="Resolving dispute..."
                    >
                      Execute Binding Resolution
                    </AdminButton>

                    <AdminButton
                      variant="secondary"
                      type="button"
                      onClick={() => setSelectedDispute(null)}
                      disabled={resolveMutation.isPending}
                    >
                      Cancel
                    </AdminButton>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
