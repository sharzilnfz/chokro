// Admin drop zones page: register collection points and open each zone's printable QR poster.
'use client';

// Form/ref primitives, admin UI components, data hooks, and auth for poster printing.
import { useRef, useState, type FormEvent } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminInput } from '../components/ui/AdminInput';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminResourceState } from '../components/ui/AdminResourceState';
import { useAdminNotice } from '../components/ui/AdminNotice';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  useAdminDropZones,
  useCreateDropZone,
  type DropZone,
} from '../hooks/useAdminDropZones';
import { formatLabel, getErrorMessage } from '../lib/formatters';
import { parseApiError } from '../services/adminApi';
import { CATEGORY_OPTIONS } from './categories';

export default function AdminDropZonesPage() {
  // Authenticated request helper for the poster endpoint, plus list/create data hooks.
  const { request } = useAdminAuth();
  const { data: zones = [], isLoading, isError, refetch } = useAdminDropZones();
  const createZoneMutation = useCreateDropZone();
  const formRef = useRef<HTMLFormElement>(null);
  const { showNotice, clearNotice, noticeElement } = useAdminNotice();

  // UI state: which zone (if any) is generating its poster.
  const [printingId, setPrintingId] = useState<string | null>(null);

  // Collects the checked categories and the zone's identifying fields, then creates the zone.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotice();

    const formData = new FormData(event.currentTarget);
    const selected = CATEGORY_OPTIONS.filter((category) =>
      formData.getAll('categories').includes(category.value),
    ).map((category) => category.value);

    if (selected.length === 0) {
      showNotice('error', 'Choose at least one accepted category.');
      return;
    }

    const institutionId = String(formData.get('institutionId') || '').trim();
    const name = String(formData.get('name') || '').trim();
    const maxCapStr = String(formData.get('maxCapacityKg') || '').trim();
    const maxCapacityKg = maxCapStr ? parseFloat(maxCapStr) : 50;

    try {
      await createZoneMutation.mutateAsync({
        institutionId,
        name,
        acceptedCategories: selected,
        maxCapacityKg: isNaN(maxCapacityKg) ? 50 : maxCapacityKg,
      });

      showNotice('success', 'Drop zone created successfully. Print its poster and display it on-site.');
      formRef.current?.reset();
    } catch (error) {
      showNotice('error', getErrorMessage(error, 'Drop zone could not be created.'));
    }
  }

  // Fetches the signed QR poster for a zone and opens it in a new window primed for printing.
  async function openPoster(zone: DropZone) {
    setPrintingId(zone.id);
    clearNotice();

    try {
      const response = await request(`/api/drop-zones/${zone.id}/poster`);
      if (!response.ok) {
        showNotice('error', await parseApiError(response, 'The poster could not be generated.'));
        return;
      }

      const html = await response.text();
      const posterWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!posterWindow) {
        showNotice('error', 'Allow pop-ups for this site to open the poster.');
        return;
      }

      posterWindow.document.open();
      posterWindow.document.write(html);
      posterWindow.document.close();
      posterWindow.focus();
      posterWindow.print();
    } catch {
      showNotice('error', 'The poster could not be generated. Check the service and try again.');
    } finally {
      setPrintingId(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        kicker="Collections infrastructure (A02)"
        title="Drop zones"
        description="Register collection points, manage calibrated capacities, and print cryptographic QR posters for on-site physical bins."
      />

      {/* Dismissible toast for create/poster results */}
      {noticeElement}

      {/* Registration form for a new collection point */}
      <section className="admin-panel" aria-labelledby="create-zone-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="create-zone-title">
              Register a drop zone
            </h2>
            <p className="admin-section-copy">
              Name, institution, capacity, and accepted categories are required.
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

          <AdminInput
            id="zone-capacity"
            name="maxCapacityKg"
            label="Max Capacity Limit (kg)"
            type="number"
            step="1"
            min="5"
            placeholder="50"
            defaultValue="50"
          />

          {/* Category checkboxes the new zone will accept */}
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

      {/* Registered-zones table with loading, error, and empty states */}
      <section className="admin-panel" aria-labelledby="zone-list-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="zone-list-title">
              Registered zones
            </h2>
            <p className="admin-section-copy">Each zone has a unique signed QR and telemetry telemetry tracking.</p>
          </div>
          {!isLoading && <span className="admin-panel-count">{zones.length} shown</span>}
        </div>

        {/* Branch on load / error / empty / data states for the zones panel */}
        <AdminResourceState
          isLoading={isLoading}
          isError={isError && zones.length === 0}
          isEmpty={zones.length === 0}
          onRetry={() => void refetch()}
          skeleton={<AdminSkeleton rowCount={4} colCount={5} label="Loading drop zones" />}
          errorTitle="Drop zones unavailable"
          errorCopy="Retry the request when the admin API is available."
          emptyTitle="No drop zones yet"
          emptyCopy="Register the first collection point above."
        >
          <div className="admin-table-wrap admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Institution</th>
                  <th scope="col">Fill / Capacity</th>
                  <th scope="col">Accepted categories</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => {
                  const maxCap = Number(zone.max_capacity_kg) || 50;
                  const currFill = Number(zone.current_fill_kg) || 0;
                  const percentage = Math.round((currFill / maxCap) * 100);

                  return (
                    <tr key={zone.id}>
                      <td data-label="Name">
                        <span className="admin-cell-primary">{zone.name}</span>
                      </td>
                      <td data-label="Institution">{zone.institution_id}</td>
                      <td data-label="Fill / Capacity">
                        <div className="text-sm">
                          <span className="font-semibold">{currFill} kg</span> / {maxCap} kg
                          <span
                            className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${
                              percentage >= 85
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {percentage}%
                          </span>
                        </div>
                      </td>
                      <td data-label="Accepted categories">
                        <div className="admin-capabilities">
                          {zone.accepted_categories.map((category) => (
                            <AdminBadge key={category}>{formatLabel(category)}</AdminBadge>
                          ))}
                        </div>
                      </td>
                      <td data-label="Actions">
                        <div className="flex items-center gap-2">
                          <AdminButton
                            variant="secondary"
                            type="button"
                            loading={printingId === zone.id}
                            loadingText="Opening..."
                            onClick={() => void openPoster(zone)}
                          >
                            Print poster
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
    </>
  );
}
