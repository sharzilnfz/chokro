'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminSession } from '../admin-console';

const FILTERS = ['ALL', 'APPLIED', 'VERIFIED', 'REJECTED'] as const;

type PartnerStatus = Exclude<(typeof FILTERS)[number], 'ALL'>;
type Filter = (typeof FILTERS)[number];

type Partner = {
  id: string;
  org_name: string;
  types: string[] | string;
  e_waste_licensed: boolean;
  doe_license_doc: string | null;
  status: PartnerStatus;
};

type Notice = { tone: 'success' | 'error'; text: string } | null;

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase());
}

async function apiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminPartnersPage() {
  const { request } = useAdminSession();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const response = await request('/api/admin/partners');
      if (!response.ok) {
        setNotice({ tone: 'error', text: await apiError(response, 'Partner applications could not be loaded.') });
        return;
      }
      const body = (await response.json()) as { partners?: Partner[] };
      setPartners(Array.isArray(body.partners) ? body.partners : []);
    } catch {
      setNotice({ tone: 'error', text: 'Partner applications could not be loaded. Check the service and try again.' });
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchPartners(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchPartners]);

  async function updatePartner(partner: Partner, status: 'VERIFIED' | 'REJECTED') {
    setUpdatingId(partner.id);
    setNotice(null);

    try {
      const response = await request('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: partner.id, status }),
      });

      if (!response.ok) {
        setNotice({ tone: 'error', text: await apiError(response, `${partner.org_name} could not be updated.`) });
        return;
      }

      const body = (await response.json()) as { partner?: Partner };
      setPartners((current) => current.map((item) => (
        item.id === partner.id ? (body.partner || { ...item, status }) : item
      )));
      setNotice({
        tone: 'success',
        text: status === 'VERIFIED'
          ? `${partner.org_name} approved and moved to Verified.`
          : `${partner.org_name} rejected and moved to Rejected.`,
      });
    } catch {
      setNotice({ tone: 'error', text: `${partner.org_name} could not be updated. Check the service and try again.` });
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredPartners = partners.filter((partner) => filter === 'ALL' || partner.status === filter);

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
              {label(value)}
            </button>
          ))}
        </div>
      </header>

      {notice && (
        <p className="admin-status-message" data-tone={notice.tone} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      <section className="admin-panel" aria-labelledby="partner-list-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="partner-list-title">Applications</h2>
            <p className="admin-section-copy">Approval and rejection outcomes are recorded immediately.</p>
          </div>
          {!loading && <span className="admin-panel-count">{filteredPartners.length} shown</span>}
        </div>

        {loading ? (
          <LoadingRows />
        ) : notice?.tone === 'error' && partners.length === 0 ? (
          <div className="admin-state">
            <div className="admin-state-content">
              <h3 className="admin-state-title">Partner queue unavailable</h3>
              <p className="admin-state-copy">Retry the request when the admin API is available.</p>
              <button className="admin-button admin-button-secondary" type="button" onClick={() => void fetchPartners()}>
                Retry
              </button>
            </div>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="admin-state">
            <div className="admin-state-content">
              <h3 className="admin-state-title">No matching applications</h3>
              <p className="admin-state-copy">
                {partners.length === 0 ? 'No partner applications have been submitted.' : `No applications currently have ${label(filter).toLowerCase()} status.`}
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
                      <td data-label="Organization"><span className="admin-cell-primary">{partner.org_name}</span></td>
                      <td data-label="Capabilities">
                        <div className="admin-capabilities">
                          {types.filter(Boolean).map((type) => <span className="admin-badge" key={type}>{label(type)}</span>)}
                        </div>
                      </td>
                      <td data-label="DoE status">
                        <span className="admin-badge" data-status={partner.e_waste_licensed ? 'LICENSED' : 'MISSING'}>
                          {partner.e_waste_licensed ? 'Licensed' : 'Not licensed'}
                        </span>
                      </td>
                      <td data-label="DoE document">
                        <div className="admin-document">
                          <span className="admin-document-name">{partner.doe_license_doc || 'No document submitted'}</span>
                          <span className="admin-document-note">
                            {partner.doe_license_doc ? 'Submitted reference' : 'Document unavailable'}
                          </span>
                        </div>
                      </td>
                      <td data-label="Application">
                        <span className="admin-badge" data-status={partner.status}>{label(partner.status)}</span>
                      </td>
                      <td data-label="Decision">
                        {partner.status === 'APPLIED' ? (
                          <div className="admin-actions">
                            <button
                              className="admin-button admin-button-primary"
                              type="button"
                              disabled={updatingId !== null}
                              onClick={() => void updatePartner(partner, 'VERIFIED')}
                            >
                              {isUpdating ? 'Saving...' : 'Approve'}
                            </button>
                            <button
                              className="admin-button admin-button-danger"
                              type="button"
                              disabled={updatingId !== null}
                              onClick={() => void updatePartner(partner, 'REJECTED')}
                            >
                              Reject
                            </button>
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

function LoadingRows() {
  return (
    <div className="admin-skeleton-list" role="status" aria-label="Loading partner applications">
      {[0, 1, 2, 3].map((row) => (
        <div className="admin-skeleton-row" key={row} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((column) => <span className="admin-skeleton-line" key={column} />)}
        </div>
      ))}
    </div>
  );
}
