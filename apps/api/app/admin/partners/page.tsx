'use client';

import { PARTNER_STATUSES, type PartnerStatus } from '@chokro/shared';
import { useState } from 'react';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage, type NoticeTone } from '../components/ui/AdminStatusMessage';
import { useAdminPartners, useUpdatePartnerStatus, type Partner } from '../hooks/useAdminPartners';
import { formatLabel } from '../lib/formatters';

const FILTERS = ['ALL', ...PARTNER_STATUSES] as const;
type Filter = (typeof FILTERS)[number];

type Notice = { tone: NoticeTone; text: string } | null;

export default function AdminPartnersPage() {
  const { data: partners = [], isLoading, isError, refetch } = useAdminPartners();
  const updateStatusMutation = useUpdatePartnerStatus();

  const [filter, setFilter] = useState<Filter>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  async function handleUpdatePartner(partner: Partner, status: 'VERIFIED' | 'REJECTED') {
    setUpdatingId(partner.id);
    setNotice(null);

    try {
      await updateStatusMutation.mutateAsync({ partnerId: partner.id, status });
      setNotice({
        tone: 'success',
        text:
          status === 'VERIFIED'
            ? `${partner.org_name} approved and moved to Verified.`
            : `${partner.org_name} rejected and moved to Rejected.`,
      });
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : `${partner.org_name} could not be updated.`;
      setNotice({ tone: 'error', text: errMessage });
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredPartners = partners.filter(
    (partner) => filter === 'ALL' || partner.status === filter,
  );

  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="admin-page-kicker">Network operations</p>
          <h1 className="admin-page-title">Partner queue</h1>
          <p className="admin-page-description">
            Review each organization&apos;s capabilities, DoE status, and submitted document before recording a decision.
          </p>
        </div>

        <div className="admin-filter-bar" aria-label="Filter partner applications">
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
      </header>

      {notice && <AdminStatusMessage tone={notice.tone}>{notice.text}</AdminStatusMessage>}

      <section className="admin-panel" aria-labelledby="partner-list-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="partner-list-title">
              Applications
            </h2>
            <p className="admin-section-copy">Approval and rejection outcomes are recorded immediately.</p>
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
                  const isUpdating = updatingId === partner.id;
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
                              disabled={updatingId !== null}
                              loading={isUpdating && updateStatusMutation.isPending}
                              loadingText="Saving..."
                              onClick={() => void handleUpdatePartner(partner, 'VERIFIED')}
                            >
                              Approve
                            </AdminButton>
                            <AdminButton
                              variant="danger"
                              type="button"
                              disabled={updatingId !== null}
                              onClick={() => void handleUpdatePartner(partner, 'REJECTED')}
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
    </>
  );
}
