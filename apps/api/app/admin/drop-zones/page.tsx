'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminSession } from '../admin-console';
import { CATEGORY_OPTIONS } from './categories';

type DropZone = {
  id: string;
  institution_id: string;
  name: string;
  accepted_categories: string[];
  qr_token: string;
  status: string;
  created_at: string;
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

export default function AdminDropZonesPage() {
  const { request } = useAdminSession();
  const [zones, setZones] = useState<DropZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const response = await request('/api/drop-zones');
      if (!response.ok) {
        setNotice({ tone: 'error', text: await apiError(response, 'Drop zones could not be loaded.') });
        return;
      }
      const body = (await response.json()) as { zones?: DropZone[] };
      setZones(Array.isArray(body.zones) ? body.zones : []);
    } catch {
      setNotice({ tone: 'error', text: 'Drop zones could not be loaded. Check the service and try again.' });
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchZones(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchZones]);

  async function createZone(formData: FormData) {
    setCreating(true);
    setNotice(null);

    const selected = CATEGORY_OPTIONS
      .filter((category) => formData.getAll('categories').includes(category.value))
      .map((category) => category.value);

    try {
      if (selected.length === 0) {
        setNotice({ tone: 'error', text: 'Choose at least one accepted category.' });
        return;
      }

      const response = await request('/api/drop-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: String(formData.get('institutionId') || '').trim(),
          name: String(formData.get('name') || '').trim(),
          acceptedCategories: selected,
        }),
      });

      if (!response.ok) {
        setNotice({ tone: 'error', text: await apiError(response, 'Drop zone could not be created.') });
        return;
      }

      setNotice({ tone: 'success', text: 'Drop zone created. Print its poster and display it on-site.' });
      const form = document.getElementById('drop-zone-form') as HTMLFormElement | null;
      form?.reset();
      await fetchZones();
    } catch {
      setNotice({ tone: 'error', text: 'Drop zone could not be created. Check the service and try again.' });
    } finally {
      setCreating(false);
    }
  }

  async function openPoster(zone: DropZone) {
    setNotice(null);
    try {
      const response = await request(`/api/drop-zones/${zone.id}/poster`);
      if (!response.ok) {
        setNotice({ tone: 'error', text: await apiError(response, 'The poster could not be generated.') });
        return;
      }
      const html = await response.text();
      const posterWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!posterWindow) {
        setNotice({ tone: 'error', text: 'Allow pop-ups for this site to open the poster.' });
        return;
      }
      posterWindow.document.open();
      posterWindow.document.write(html);
      posterWindow.document.close();
      posterWindow.focus();
      posterWindow.print();
    } catch {
      setNotice({ tone: 'error', text: 'The poster could not be generated. Check the service and try again.' });
    }
  }

  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="admin-page-kicker">Collections infrastructure</p>
          <h1 className="admin-page-title">Drop zones</h1>
          <p className="admin-page-description">
            Register collection points and print their QR poster. The QR is what a Chokro user scans to recognize a
            drop zone; it does not create a deposit or credit in Sprint 1.
          </p>
        </div>
      </header>

      {notice && (
        <p className="admin-status-message" data-tone={notice.tone} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      <section className="admin-panel" aria-labelledby="create-zone-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="create-zone-title">Register a drop zone</h2>
            <p className="admin-section-copy">Name, institution, and accepted categories are required. Location can be added later.</p>
          </div>
        </div>
        <form
          id="drop-zone-form"
          className="admin-form admin-form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void createZone(new FormData(event.currentTarget));
          }}
        >
          <div className="admin-field">
            <label className="admin-label" htmlFor="zone-name">Drop zone name</label>
            <input className="admin-input" id="zone-name" name="name" type="text" required placeholder="e.g. North Hall Collection Point" />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="zone-institution">Institution ID</label>
            <input className="admin-input" id="zone-institution" name="institutionId" type="text" required placeholder="e.g. BUET" />
          </div>
          <fieldset className="admin-field admin-checkbox-group">
            <legend className="admin-label">Accepted categories</legend>
            {CATEGORY_OPTIONS.map((category) => (
              <label className="admin-checkbox" key={category.value}>
                <input type="checkbox" name="categories" value={category.value} />
                <span>{label(category.value)}</span>
              </label>
            ))}
          </fieldset>
          <div className="admin-form-actions">
            <button className="admin-button admin-button-primary" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create drop zone'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel" aria-labelledby="zone-list-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="zone-list-title">Registered zones</h2>
            <p className="admin-section-copy">Each zone has a unique signed QR for recognition.</p>
          </div>
          {!loading && <span className="admin-panel-count">{zones.length} shown</span>}
        </div>

        {loading ? (
          <LoadingRows />
        ) : notice?.tone === 'error' && zones.length === 0 ? (
          <div className="admin-state">
            <div className="admin-state-content">
              <h3 className="admin-state-title">Drop zones unavailable</h3>
              <p className="admin-state-copy">Retry the request when the admin API is available.</p>
              <button className="admin-button admin-button-secondary" type="button" onClick={() => void fetchZones()}>
                Retry
              </button>
            </div>
          </div>
        ) : zones.length === 0 ? (
          <div className="admin-state">
            <div className="admin-state-content">
              <h3 className="admin-state-title">No drop zones yet</h3>
              <p className="admin-state-copy">Register the first collection point above.</p>
            </div>
          </div>
        ) : (
          <div className="admin-table-wrap admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Institution</th>
                  <th scope="col">Accepted categories</th>
                  <th scope="col">Poster</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td data-label="Name"><span className="admin-cell-primary">{zone.name}</span></td>
                    <td data-label="Institution">{zone.institution_id}</td>
                    <td data-label="Accepted categories">
                      <div className="admin-capabilities">
                        {(Array.isArray(zone.accepted_categories) ? zone.accepted_categories : []).map((category) => (
                          <span className="admin-badge" key={category}>{label(category)}</span>
                        ))}
                      </div>
                    </td>
                    <td data-label="Poster">
                      <button className="admin-button admin-button-secondary" type="button" onClick={() => void openPoster(zone)}>
                        Print poster
                      </button>
                    </td>
                  </tr>
                ))}
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
    <div className="admin-skeleton-list" role="status" aria-label="Loading drop zones">
      {[0, 1, 2, 3].map((row) => (
        <div className="admin-skeleton-row" key={row} aria-hidden="true">
          {[0, 1, 2, 3].map((column) => <span className="admin-skeleton-line" key={column} />)}
        </div>
      ))}
    </div>
  );
}
