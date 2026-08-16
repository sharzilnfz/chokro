// Admin partner queue: review partner applications and approve or reject them with a confirm step and optional rejection notes.
'use client';

// Shared partner enums, admin UI primitives, data hooks, and formatting helpers.
import { PARTNER_STATUSES, type PartnerStatus } from '@chokro/shared';
import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminConfirmModal } from '../components/ui/AdminConfirmModal';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage, type NoticeTone } from '../components/ui/AdminStatusMessage';
import { useAdminPartners, useUpdatePartnerStatus, type Partner } from '../hooks/useAdminPartners';
import { formatLabel, getErrorMessage } from '../lib/formatters';

// Filter tabs: all applications or a single status bucket.
const FILTERS = ['ALL', ...PARTNER_STATUSES] as const;
type Filter = (typeof FILTERS)[number];

// Success/error feedback banner state.
type Notice = { tone: NoticeTone; text: string } | null;

// The approval/rejection queued behind the confirmation modal.
type PendingAction = {
  partner: Partner;
  status: 'VERIFIED' | 'REJECTED';
} | null;

export default function AdminPartnersPage() {
  // Load the partner queue and set up the status-update mutation.
  const { data: partners = [], isLoading, isError, refetch } = useAdminPartners();
  const updateStatusMutation = useUpdatePartnerStatus();

  // Local UI state: active filter, feedback banner, action awaiting confirmation, and rejection reason input.
  const [filter, setFilter] = useState<Filter>('ALL');
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Applies the queued decision, then reports the outcome via a banner.
  async function executeStatusUpdate() {
    if (!pendingAction) return;

    const { partner, status } = pendingAction;
    setNotice(null);

    try {
      await updateStatusMutation.mutateAsync({
        partnerId: partner.id,
        status,
        reason: status === 'REJECTED' ? rejectionReason || 'Application requirements not met.' : undefined,
      });
      setNotice({
        tone: 'success',
        text:
          status === 'VERIFIED'
            ? `${partner.org_name} approved and moved to Verified status.`
            : `${partner.org_name} rejected and moved to Rejected status.`,
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        text: getErrorMessage(error, `${partner.org_name} could not be updated.`),
      });
    } finally {
      setPendingAction(null);
      setRejectionReason('');
    }
  }

  // Derive the visible subset filtered by the active status tab.
  const filteredPartners = partners.filter(
    (partner) => filter === 'ALL' || partner.status === filter,
  );

  // Convenience values describing the currently queued decision for the modal copy.
  const isVerify = pendingAction?.status === 'VERIFIED';
  const pendingOrg = pendingAction?.partner.org_name ?? '';

  return (
    <>
      {/* Status filter buttons rendered as header actions */}
      <AdminPageHeader
        kicker="Network operations"
        title="Partner queue"
        description="Review each organization's capabilities, DoE status, and submitted document before recording a decision."
        actions={
          <div className="admin-filter-bar" role="group" aria-label="Filter partner applications">
            {FILTERS.map((value) => (
              <button
                className="admin-filter-button"
                type="button"
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {formatLabel(value)}
              </button>
            ))}
          </div>
        }
      />

      {/* Dismissible toast for decision results */}
      {notice && (
        <AdminStatusMessage tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminStatusMessage>
      )}

      {/* Application table with loading, error, and empty states */}
      <section className="admin-panel" aria-labelledby="partner-list-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="partner-list-title">
              Applications
            </h2>
            <p className="admin-section-copy">Decisions are recorded immediately into the network ledger.</p>
          </div>
          {/* Visible count once data has loaded */}
          {!isLoading && <span className="admin-panel-count">{filteredPartners.length} shown</span>}
        </div>

        {/* Branch on load / error / empty / data states for the applications panel */}
        {isLoading ? (
          <AdminSkeleton rowCount={4} colCount={6} label="Loading partner applications" />
        ) : isError && partners.length === 0 ? (
          <div className="admin-state">
            <div className="admin-state-content">
              <h3 className="admin-state-title">Partner queue unavailable</h3>
              <p className="admin-state-copy">Retry the request when the admin API is available.</p>
              <AdminButton variant="secondary" type="button" onClick={() => void refetch()}>
                Retry
              </AdminButton>
            </div>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="admin-state">
            <div className="admin-state-content">
              <h3 className="admin-state-title">No matching applications</h3>
              <p className="admin-state-copy">
                {partners.length === 0
                  ? 'No partner applications have been submitted.'
                  : `No applications currently have ${formatLabel(filter).toLowerCase()} status.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="admin-table-wrap admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Organization</th>
                  <th scope="col">Capabilities & Type</th>
                  <th scope="col">DoE status</th>
                  <th scope="col">DoE document</th>
                  <th scope="col">Status & Notes</th>
                  <th scope="col">Decision</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.map((partner) => (
                  <tr key={partner.id}>
                    <td data-label="Organization">
                      <span className="admin-cell-primary">{partner.org_name}</span>
                    </td>
                    <td data-label="Capabilities & Type">
                      <div className="admin-capabilities flex flex-wrap gap-1">
                        {partner.types.map((type) => (
                          <AdminBadge key={type}>{formatLabel(type)}</AdminBadge>
                        ))}
                      </div>
                      {partner.capability_flags && Object.keys(partner.capability_flags).length > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          {Object.entries(partner.capability_flags)
                            .filter(([_, enabled]) => Boolean(enabled))
                            .map(([cap]) => cap.replace('_', ' '))
                            .join(', ')}
                        </div>
                      )}
                    </td>
                    <td data-label="DoE status">
                      <AdminBadge status={partner.e_waste_licensed ? 'LICENSED' : 'MISSING'}>
                        {partner.e_waste_licensed ? 'Licensed' : 'Not licensed'}
                      </AdminBadge>
                    </td>
                    <td data-label="DoE document">
                      <div className="admin-document">
                        <span className="admin-document-name">
                          {partner.doe_license_doc || 'No document submitted'}
                        </span>
                        <span className="admin-document-note">
                          {partner.doe_license_doc ? 'Submitted reference' : 'Document unavailable'}
                        </span>
                      </div>
                    </td>
                    <td data-label="Status & Notes">
                      <div>
                        <AdminBadge status={partner.status}>{formatLabel(partner.status)}</AdminBadge>
                        {partner.reason && (
                          <div className="text-xs text-red-600 mt-1 bg-red-50 p-1.5 rounded border border-red-200">
                            <strong>Note:</strong> {partner.reason}
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Decision cell: approve/reject for pending applications, text otherwise */}
                    <td data-label="Decision">
                      {partner.status === 'APPLIED' ? (
                        <div className="admin-actions">
                          <AdminButton
                            variant="primary"
                            type="button"
                            onClick={() => {
                              setRejectionReason('');
                              setPendingAction({ partner, status: 'VERIFIED' });
                            }}
                          >
                            Approve
                          </AdminButton>
                          <AdminButton
                            variant="danger"
                            type="button"
                            onClick={() => {
                              setRejectionReason('');
                              setPendingAction({ partner, status: 'REJECTED' });
                            }}
                          >
                            Reject
                          </AdminButton>
                        </div>
                      ) : (
                        <span>{partner.status === 'VERIFIED' ? 'Approved' : 'Rejected'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Confirmation modal for partner verification decisions */}
      <AdminConfirmModal
        isOpen={pendingAction !== null}
        title={isVerify ? `Approve ${pendingOrg}?` : `Reject ${pendingOrg}?`}
        description={
          isVerify ? (
            <span>This will grant {pendingOrg} verified status across the Chokro recycling network.</span>
          ) : (
            <div>
              <p className="mb-3">
                This will reject the application submitted by {pendingOrg}. You can provide an explanation below so the applicant can correct their submission.
              </p>
              <div>
                <label htmlFor="rejection-reason" className="block text-xs font-semibold text-slate-700 mb-1">
                  Rejection Reason (Returned to applicant)
                </label>
                <textarea
                  id="rejection-reason"
                  rows={3}
                  className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="e.g. DoE license document is expired or invalid. Please re-upload a clear copy."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          )
        }
        confirmLabel={isVerify ? 'Approve partner' : 'Reject application'}
        confirmVariant={isVerify ? 'primary' : 'danger'}
        loading={updateStatusMutation.isPending}
        onConfirm={executeStatusUpdate}
        onCancel={() => {
          setPendingAction(null);
          setRejectionReason('');
        }}
      />
    </>
  );
}
