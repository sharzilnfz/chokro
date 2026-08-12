'use client';

import { PARTNER_STATUSES, type PartnerStatus } from '@chokro/shared';
import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminConfirmModal } from '../components/ui/AdminConfirmModal';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage, type NoticeTone } from '../components/ui/AdminStatusMessage';
import { useAdminPartners, useUpdatePartnerStatus, type Partner } from '../hooks/useAdminPartners';
import { formatLabel } from '../lib/formatters';

const FILTERS = ['ALL', ...PARTNER_STATUSES] as const;
type Filter = (typeof FILTERS)[number];

type Notice = { tone: NoticeTone; text: string } | null;

type PendingAction = {
  partner: Partner;
  status: 'VERIFIED' | 'REJECTED';
} | null;

export default function AdminPartnersPage() {
  const { data: partners = [], isLoading, isError, refetch } = useAdminPartners();
  const updateStatusMutation = useUpdatePartnerStatus();

  const [filter, setFilter] = useState<Filter>('ALL');
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  async function executeStatusUpdate() {
    if (!pendingAction) return;

    const { partner, status } = pendingAction;
    setNotice(null);

    try {
      await updateStatusMutation.mutateAsync({ partnerId: partner.id, status });
      setNotice({
        tone: 'success',
        text:
          status === 'VERIFIED'
            ? `${partner.org_name} approved and moved to Verified status.`
            : `${partner.org_name} rejected and moved to Rejected status.`,
      });
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : `${partner.org_name} could not be updated.`;
      setNotice({ tone: 'error', text: errMessage });
    } finally {
      setPendingAction(null);
    }
  }

  const filteredPartners = partners.filter(
    (partner) => filter === 'ALL' || partner.status === filter,
  );

  return (
    <>
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

      {notice && (
        <AdminStatusMessage tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminStatusMessage>
      )}

      <section className="admin-panel" aria-labelledby="partner-list-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="partner-list-title">
              Applications
            </h2>
            <p className="admin-section-copy">Decisions are recorded immediately into the network ledger.</p>
          </div>
          {!isLoading && <span className="admin-panel-count">{filteredPartners.length} shown</span>}
        </div>

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
                  <th scope="col">Capabilities</th>
                  <th scope="col">DoE status</th>
                  <th scope="col">DoE document</th>
                  <th scope="col">Application</th>
                  <th scope="col">Decision</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.map((partner) => {
                  const types = Array.isArray(partner.types) ? partner.types : [partner.types];
                  return (
                    <tr key={partner.id}>
                      <td data-label="Organization">
                        <span className="admin-cell-primary">{partner.org_name}</span>
                      </td>
                      <td data-label="Capabilities">
                        <div className="admin-capabilities">
                          {types.filter(Boolean).map((type) => (
                            <AdminBadge key={type}>{formatLabel(type)}</AdminBadge>
                          ))}
                        </div>
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
                      <td data-label="Application">
                        <AdminBadge status={partner.status}>{formatLabel(partner.status)}</AdminBadge>
                      </td>
                      <td data-label="Decision">
                        {partner.status === 'APPLIED' ? (
                          <div className="admin-actions">
                            <AdminButton
                              variant="primary"
                              type="button"
                              onClick={() => setPendingAction({ partner, status: 'VERIFIED' })}
                            >
                              Approve
                            </AdminButton>
                            <AdminButton
                              variant="danger"
                              type="button"
                              onClick={() => setPendingAction({ partner, status: 'REJECTED' })}
                            >
                              Reject
                            </AdminButton>
                          </div>
                        ) : (
                          <span>{partner.status === 'VERIFIED' ? 'Approved' : 'Rejected'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Confirmation modal for partner verification decisions */}
      <AdminConfirmModal
        isOpen={pendingAction !== null}
        title={
          pendingAction?.status === 'VERIFIED'
            ? `Approve ${pendingAction?.partner.org_name}?`
            : `Reject ${pendingAction?.partner.org_name}?`
        }
        description={
          pendingAction?.status === 'VERIFIED'
            ? `This will grant ${pendingAction?.partner.org_name} verified status across the Chokro recycling network.`
            : `This will reject the application submitted by ${pendingAction?.partner.org_name}.`
        }
        confirmLabel={pendingAction?.status === 'VERIFIED' ? 'Approve partner' : 'Reject application'}
        confirmVariant={pendingAction?.status === 'VERIFIED' ? 'primary' : 'danger'}
        loading={updateStatusMutation.isPending}
        onConfirm={executeStatusUpdate}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
}
