'use client';

import { CATEGORIES, CONDITIONS, type Category, type Condition } from '@chokro/shared';
import { useState, type FormEvent } from 'react';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminInput } from '../components/ui/AdminInput';
import { AdminSelect } from '../components/ui/AdminSelect';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage, type NoticeTone } from '../components/ui/AdminStatusMessage';
import { useAdminRateCards, usePublishRate } from '../hooks/useAdminRateCards';
import { formatDate, formatLabel, formatPrice, unitForCategory } from '../lib/formatters';

const CATEGORY_OPTIONS = CATEGORIES.map((value) => ({
  value,
  label: formatLabel(value),
}));

const CONDITION_OPTIONS = CONDITIONS.map((value) => ({
  value,
  label: formatLabel(value),
}));

type Notice = { tone: NoticeTone; text: string } | null;

export default function AdminRateCardPage() {
  const { data: rates = [], isLoading, isError, refetch } = useAdminRateCards();
  const publishRateMutation = usePublishRate();

  const [category, setCategory] = useState<Category>('PLASTICS');
  const [conditionBand, setConditionBand] = useState<Condition>('GOOD');
  const [priceBdt, setPriceBdt] = useState('');
  const [notice, setNotice] = useState<Notice>(null);

  const unit = unitForCategory(category);

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    try {
      await publishRateMutation.mutateAsync({
        category,
        conditionBand,
        unit,
        priceBdt: Number(priceBdt),
      });

      setNotice({
        tone: 'success',
        text: `${formatLabel(category)} ${formatLabel(conditionBand)} rate published at ${formatPrice(priceBdt)} per ${unit}.`,
      });
      setPriceBdt('');
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'The rate entry could not be published.';
      setNotice({ tone: 'error', text: errMessage });
    }
  }

  const sortedRates = [...rates].sort((first, second) => {
    return new Date(second.effective_from).getTime() - new Date(first.effective_from).getTime();
  });
  const currentKeys = new Set<string>();

  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="admin-page-kicker">Pricing operations</p>
          <h1 className="admin-page-title">Rate card</h1>
          <p className="admin-page-description">
            Add an effective rate for a category and condition. Materials use kilograms; appliances and e-waste use pieces.
          </p>
        </div>
      </header>

      {notice && <AdminStatusMessage tone={notice.tone}>{notice.text}</AdminStatusMessage>}

      <div className="admin-workspace-grid">
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

            <div className="admin-field">
              <span className="admin-label">Pricing unit</span>
              <div className="admin-derived-value" aria-live="polite">
                <span>Per {unit}</span>
                <span className="admin-derived-note">Derived from category</span>
              </div>
            </div>

            <AdminInput
              id="rate-price"
              label="Price in BDT"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="45.00"
              value={priceBdt}
              onChange={(event) => setPriceBdt(event.target.value)}
              hint="Enter a positive amount with up to two decimal places."
              required
            />

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

        <section className="admin-panel" aria-labelledby="rate-history-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="rate-history-title">
                Version history
              </h2>
              <p className="admin-section-copy">Newest entry for each category and condition is current.</p>
            </div>
            {!isLoading && (
              <span className="admin-panel-count">
                {rates.length} {rates.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>

          {isLoading ? (
            <AdminSkeleton rowCount={4} colCount={5} label="Loading rate history" />
          ) : isError && rates.length === 0 ? (
            <div className="admin-state">
              <div className="admin-state-content">
                <h3 className="admin-state-title">Rate history unavailable</h3>
                <p className="admin-state-copy">Retry the request when the admin API is available.</p>
                <AdminButton variant="secondary" type="button" onClick={() => void refetch()}>
                  Retry
                </AdminButton>
              </div>
            </div>
          ) : sortedRates.length === 0 ? (
            <div className="admin-state">
              <div className="admin-state-content">
                <h3 className="admin-state-title">No rate entries yet</h3>
                <p className="admin-state-copy">Publish the first rate to start the version history.</p>
              </div>
            </div>
          ) : (
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
                  {sortedRates.map((rate) => {
                    const key = `${rate.category}:${rate.condition_band}`;
                    const isCurrent = !currentKeys.has(key);
                    currentKeys.add(key);
                    return (
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
                          <AdminBadge status={isCurrent ? 'CURRENT' : 'HISTORICAL'}>
                            {isCurrent ? 'Current' : 'Previous'}
                          </AdminBadge>
                        </td>
                        <td data-label="Effective from">{formatDate(rate.effective_from)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
