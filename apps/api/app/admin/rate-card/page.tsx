// Admin rate card page: publish category/condition rates and review the versioned price history.
'use client';

// Shared domain enums, admin UI primitives, data hooks, and formatting helpers used below.
import { CONDITIONS, type Category, type Condition } from '@chokro/shared';
import { useState, type FormEvent } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminInput } from '../components/ui/AdminInput';
import { AdminSelect } from '../components/ui/AdminSelect';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminResourceState } from '../components/ui/AdminResourceState';
import { useAdminNotice } from '../components/ui/AdminNotice';
import { useAdminRateCards, usePublishRate } from '../hooks/useAdminRateCards';
import { formatDate, formatLabel, formatPrice, getErrorMessage, unitForCategory } from '../lib/formatters';
import { CATEGORY_OPTIONS } from '../drop-zones/categories';

// Static select options derived once from the shared condition enum.
const CONDITION_OPTIONS = CONDITIONS.map((value) => ({
  value,
  label: formatLabel(value),
}));

export default function AdminRateCardPage() {
  // Fetch existing rate history and prepare the publish mutation against the admin API.
  const { data: rates = [], isLoading, isError, refetch } = useAdminRateCards();
  const publishRateMutation = usePublishRate();
  const { showNotice, clearNotice, noticeElement } = useAdminNotice();

  // Form state for the rate being published and any validation/feedback text.
  const [category, setCategory] = useState<Category>('PLASTICS');
  const [conditionBand, setConditionBand] = useState<Condition>('GOOD');
  const [priceBdt, setPriceBdt] = useState('');
  const [priceError, setPriceError] = useState('');

  // Unit is derived from the chosen category (kg for materials, pieces for appliances/e-waste).
  const unit = unitForCategory(category);

  // Sort rates newest-first and flag the most recent entry per category/condition as current.
  const sortedRatesWithVersion = [...rates]
    .sort((first, second) => {
      return new Date(second.effective_from).getTime() - new Date(first.effective_from).getTime();
    })
    .map((rate, index, sorted) => {
      const isCurrent =
        index === 0 ||
        sorted[index - 1].category !== rate.category ||
        sorted[index - 1].condition_band !== rate.condition_band;
      return { ...rate, isCurrent };
    });

  // Validate price, call the publish mutation, and surface success or error feedback.
  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearNotice();
    setPriceError('');

    const numericPrice = Number(priceBdt);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setPriceError('Please enter a valid positive amount.');
      return;
    }

    try {
      await publishRateMutation.mutateAsync({
        category,
        conditionBand,
        unit,
        priceBdt: numericPrice,
      });

      showNotice(
        'success',
        `${formatLabel(category)} ${formatLabel(conditionBand)} rate published at ${formatPrice(numericPrice)} per ${unit}.`,
      );
      setPriceBdt('');
    } catch (error) {
      showNotice('error', getErrorMessage(error, 'The rate entry could not be published.'));
    }
  }

  return (
    <>
      {/* Page header describing what this workflow controls */}
      <AdminPageHeader
        kicker="Pricing operations"
        title="Rate card"
        description="Add an effective rate for a category and condition. Materials use kilograms; appliances and e-waste use pieces."
      />

      {/* Dismissible toast for publish results */}
      {noticeElement}

      <div className="admin-workspace-grid">
        {/* Form to publish a new rate for a category/condition */}
        <section className="admin-panel admin-form-panel" aria-labelledby="publish-rate-title">
          <h2 className="admin-section-heading" id="publish-rate-title">
            Publish a rate
          </h2>
          <p className="admin-section-copy">A new entry preserves the earlier rate in history.</p>

          <form className="admin-form" onSubmit={handlePublish}>
            <AdminSelect
              id="rate-category"
              label="Category"
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={(event) => setCategory(event.target.value as Category)}
            />

            <AdminSelect
              id="rate-condition"
              label="Condition band"
              value={conditionBand}
              options={CONDITION_OPTIONS}
              onChange={(event) => setConditionBand(event.target.value as Condition)}
            />

            {/* Derived unit readout so the admin confirms the pricing basis before submitting */}
            <div className="admin-field">
              <span className="admin-label">Pricing unit</span>
              <div className="admin-derived-value" aria-live="polite">
                <span>Per {unit}</span>
                <span className="admin-derived-note">Derived from category</span>
              </div>
            </div>

            {/* Price input clears its error as the admin types */}
            <AdminInput
              id="rate-price"
              label="Price in BDT"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="45.00"
              value={priceBdt}
              error={priceError}
              onChange={(event) => {
                setPriceBdt(event.target.value);
                if (priceError) setPriceError('');
              }}
              hint="Enter a positive amount with up to two decimal places."
              required
            />

            {/* Submit button shows pending state while the mutation runs */}
            <AdminButton
              variant="primary"
              fullWidth
              type="submit"
              loading={publishRateMutation.isPending}
              loadingText="Publishing rate..."
            >
              Publish rate
            </AdminButton>
          </form>
        </section>

        {/* Version history table with loading, error, and empty states */}
        <section className="admin-panel" aria-labelledby="rate-history-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="rate-history-title">
                Version history
              </h2>
              <p className="admin-section-copy">Newest entry for each category and condition is current.</p>
            </div>
            {/* Entry count once data has loaded */}
            {!isLoading && (
              <span className="admin-panel-count">
                {rates.length} {rates.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>

          {/* Branch on load / error / empty / data states for the history panel */}
          <AdminResourceState
            isLoading={isLoading}
            isError={isError && rates.length === 0}
            isEmpty={sortedRatesWithVersion.length === 0}
            onRetry={() => void refetch()}
            skeleton={<AdminSkeleton rowCount={4} colCount={5} label="Loading rate history" />}
            errorTitle="Rate history unavailable"
            errorCopy="Retry the request when the admin API is available."
            emptyTitle="No rate entries yet"
            emptyCopy="Publish the first rate to start the version history."
          >
            <div className="admin-table-wrap admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Condition</th>
                    <th scope="col">Rate</th>
                    <th scope="col">Version</th>
                    <th scope="col">Effective from</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRatesWithVersion.map((rate) => (
                    <tr key={rate.id}>
                      <td data-label="Category">
                        <span className="admin-cell-primary">{formatLabel(rate.category)}</span>
                      </td>
                      <td data-label="Condition">{formatLabel(rate.condition_band)}</td>
                      <td data-label="Rate">
                        <span className="admin-cell-number">
                          {formatPrice(rate.price_bdt)} / {rate.unit}
                        </span>
                      </td>
                      <td data-label="Version">
                        <AdminBadge status={rate.isCurrent ? 'CURRENT' : 'HISTORICAL'}>
                          {rate.isCurrent ? 'Current' : 'Previous'}
                        </AdminBadge>
                      </td>
                      <td data-label="Effective from">{formatDate(rate.effective_from)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminResourceState>
        </section>
      </div>
    </>
  );
}
