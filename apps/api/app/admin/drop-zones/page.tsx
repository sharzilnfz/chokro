'use client';

import type { Category } from '@chokro/shared';
import { useRef, useState, type FormEvent } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminInput } from '../components/ui/AdminInput';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage, type NoticeTone } from '../components/ui/AdminStatusMessage';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  useAdminDropZones,
  useCreateDropZone,
  type DropZone,
} from '../hooks/useAdminDropZones';
import { formatLabel } from '../lib/formatters';
import { parseApiError } from '../services/adminApi';
import { CATEGORY_OPTIONS } from './categories';

type Notice = { tone: NoticeTone; text: string } | null;

export default function AdminDropZonesPage() {
  const { request } = useAdminAuth();
  const { data: zones = [], isLoading, isError, refetch } = useAdminDropZones();
  const createZoneMutation = useCreateDropZone();
  const formRef = useRef<HTMLFormElement>(null);

  const [notice, setNotice] = useState<Notice>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const selected = CATEGORY_OPTIONS.filter((category) =>
      formData.getAll('categories').includes(category.value),
    ).map((category) => category.value as Category);

    if (selected.length === 0) {
      setNotice({ tone: 'error', text: 'Choose at least one accepted category.' });
      return;
    }

    const institutionId = String(formData.get('institutionId') || '').trim();
    const name = String(formData.get('name') || '').trim();

    try {
      await createZoneMutation.mutateAsync({
        institutionId,
        name,
        acceptedCategories: selected,
      });

      setNotice({
        tone: 'success',
        text: 'Drop zone created successfully. Print its poster and display it on-site.',
      });
      formRef.current?.reset();
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : 'Drop zone could not be created.';
      setNotice({ tone: 'error', text: errMessage });
    }
  }

  async function openPoster(zone: DropZone) {
    setPrintingId(zone.id);
    setNotice(null);

    try {
      const response = await request(`/api/drop-zones/${zone.id}/poster`);
      if (!response.ok) {
        setNotice({
          tone: 'error',
          text: await parseApiError(response, 'The poster could not be generated.'),
        });
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
      setNotice({
        tone: 'error',
        text: 'The poster could not be generated. Check the service and try again.',
      });
    } finally {
      setPrintingId(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        kicker="Collections infrastructure"
        title="Drop zones"
        description="Register collection points and print their QR poster. The QR is what a Chokro user scans to recognize a drop zone; it does not create a deposit or credit in Sprint 1."
      />

      {notice && (
        <AdminStatusMessage tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminStatusMessage>
      )}

      <section className="admin-panel" aria-labelledby="create-zone-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="create-zone-title">
              Register a drop zone
            </h2>
            <p className="admin-section-copy">
              Name, institution, and accepted categories are required. Location can be added later.
            </p>
          </div>
        </div>

        <form
          ref={formRef}
          className="admin-form admin-form-grid"
          onSubmit={handleSubmit}
        >
          <AdminInput
            id="zone-name"
            name="name"
            label="Drop zone name"
            type="text"
            placeholder="e.g. North Hall Collection Point"
            required
          />

          <AdminInput
            id="zone-institution"
            name="institutionId"
            label="Institution ID"
            type="text"
            placeholder="e.g. BUET"
            required
          />

          <fieldset className="admin-field admin-checkbox-group">
            <legend className="admin-label">Accepted categories</legend>
            {CATEGORY_OPTIONS.map((category) => (
              <label className="admin-checkbox" key={category.value}>
                <input type="checkbox" name="categories" value={category.value} />
                <span>{formatLabel(category.value)}</span>
              </label>
            ))}
          </fieldset>

          <div className="admin-form-actions">
            <AdminButton
              variant="primary"
              type="submit"
              loading={createZoneMutation.isPending}
              loadingText="Creating..."
            >
              Create drop zone
            </AdminButton>
          </div>
        </form>
      </section>

      <section className="admin-panel" aria-labelledby="zone-list-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="zone-list-title">
              Registered zones
            </h2>
            <p className="admin-section-copy">Each zone has a unique signed QR for recognition.</p>
          </div>
          {!isLoading && <span className="admin-panel-count">{zones.length} shown</span>}
        </div>

        {isLoading ? (
          <AdminSkeleton rowCount={4} colCount={4} label="Loading drop zones" />
        ) : isError && zones.length === 0 ? (
          <div className="admin-state">
            <div className="admin-state-content">
              <h3 className="admin-state-title">Drop zones unavailable</h3>
              <p className="admin-state-copy">Retry the request when the admin API is available.</p>
              <AdminButton variant="secondary" type="button" onClick={() => void refetch()}>
                Retry
              </AdminButton>
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
                    <td data-label="Name">
                      <span className="admin-cell-primary">{zone.name}</span>
                    </td>
                    <td data-label="Institution">{zone.institution_id}</td>
                    <td data-label="Accepted categories">
                      <div className="admin-capabilities">
                        {(Array.isArray(zone.accepted_categories)
                          ? zone.accepted_categories
                          : []
                        ).map((category) => (
                          <AdminBadge key={category}>{formatLabel(category)}</AdminBadge>
                        ))}
                      </div>
                    </td>
                    <td data-label="Poster">
                      <AdminButton
                        variant="secondary"
                        type="button"
                        loading={printingId === zone.id}
                        loadingText="Opening..."
                        onClick={() => void openPoster(zone)}
                      >
                        Print poster
                      </AdminButton>
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
