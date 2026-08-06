'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAdminSession } from '../admin-console';

const CATEGORIES = [
  'CLOTHES',
  'BOOKS',
  'PLASTICS',
  'PAPER',
  'METAL',
  'GLASS',
  'FURNITURE',
  'APPLIANCES',
  'E_WASTE',
] as const;

const CONDITION_BANDS = ['EXCELLENT', 'GOOD', 'FAIR', 'SCRAP'] as const;

type Category = (typeof CATEGORIES)[number];
type ConditionBand = (typeof CONDITION_BANDS)[number];
type Unit = 'kg' | 'piece';

type RateEntry = {
  id: string;
  category: string;
  condition_band: string;
  unit: Unit;
  price_bdt: string | number;
  effective_from: string;
};

type Notice = { tone: 'success' | 'error'; text: string } | null;

function unitForCategory(category: Category): Unit {
  return category === 'E_WASTE' || category === 'APPLIANCES' ? 'piece' : 'kg';
}

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase());
}

function formatPrice(value: string | number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return `৳${new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numericValue)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

async function apiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminRateCardPage() {
  const { request } = useAdminSession();
  const [rates, setRates] = useState<RateEntry[]>([]);
  const [category, setCategory] = useState<Category>('PLASTICS');
  const [conditionBand, setConditionBand] = useState<ConditionBand>('GOOD');
  const [priceBdt, setPriceBdt] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const unit = unitForCategory(category);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const response = await request('/api/admin/rate-card');
      if (!response.ok) {
        setNotice({ tone: 'error', text: await apiError(response, 'Rate history could not be loaded.') });
        return;
      }
      const body = (await response.json()) as { entries?: RateEntry[] };
      setRates(Array.isArray(body.entries) ? body.entries : []);
    } catch {
      setNotice({ tone: 'error', text: 'Rate history could not be loaded. Check the service and try again.' });
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchRates(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchRates]);

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);

    try {
      const response = await request('/api/admin/rate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          conditionBand,
          unit,
          priceBdt: Number(priceBdt),
        }),
      });

      if (!response.ok) {
        setNotice({ tone: 'error', text: await apiError(response, 'The rate entry could not be published.') });
        return;
      }

      const body = (await response.json()) as { entry?: RateEntry };
      if (body.entry) {
        setRates((current) => [body.entry as RateEntry, ...current]);
      } else {
        await fetchRates();
      }
      setPriceBdt('');
      setNotice({ tone: 'success', text: `${label(category)} ${label(conditionBand)} rate published at ${formatPrice(priceBdt)} per ${unit}.` });
    } catch {
      setNotice({ tone: 'error', text: 'The rate entry could not be published. Check the service and try again.' });
    } finally {
      setSubmitting(false);
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

      {notice && (
        <p className="admin-status-message" data-tone={notice.tone} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      <div className="admin-workspace-grid">
        <section className="admin-panel admin-form-panel" aria-labelledby="publish-rate-title">
          <h2 className="admin-section-heading" id="publish-rate-title">Publish a rate</h2>
          <p className="admin-section-copy">A new entry preserves the earlier rate in history.</p>

          <form className="admin-form" onSubmit={handlePublish}>
            <div className="admin-field">
              <label className="admin-label" htmlFor="rate-category">Category</label>
              <select
                className="admin-select"
                id="rate-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as Category)}
              >
                {CATEGORIES.map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="rate-condition">Condition band</label>
              <select
                className="admin-select"
                id="rate-condition"
                value={conditionBand}
                onChange={(event) => setConditionBand(event.target.value as ConditionBand)}
              >
                {CONDITION_BANDS.map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </select>
            </div>

            <div className="admin-field">
              <span className="admin-label">Pricing unit</span>
              <div className="admin-derived-value" aria-live="polite">
                <span>Per {unit}</span>
                <span className="admin-derived-note">Derived from category</span>
              </div>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="rate-price">Price in BDT</label>
              <input
                className="admin-input"
                id="rate-price"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="45.00"
                value={priceBdt}
                onChange={(event) => setPriceBdt(event.target.value)}
                required
              />
              <p className="admin-field-hint">Enter a positive amount with up to two decimal places.</p>
            </div>

            <button className="admin-button admin-button-primary admin-button-block" type="submit" disabled={submitting}>
              {submitting ? 'Publishing rate...' : 'Publish rate'}
            </button>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="rate-history-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="rate-history-title">Version history</h2>
              <p className="admin-section-copy">Newest entry for each category and condition is current.</p>
            </div>
            {!loading && <span className="admin-panel-count">{rates.length} {rates.length === 1 ? 'entry' : 'entries'}</span>}
          </div>

          {loading ? (
            <LoadingRows />
          ) : notice?.tone === 'error' && rates.length === 0 ? (
            <div className="admin-state">
              <div className="admin-state-content">
                <h3 className="admin-state-title">Rate history unavailable</h3>
                <p className="admin-state-copy">Retry the request when the admin API is available.</p>
                <button className="admin-button admin-button-secondary" type="button" onClick={() => void fetchRates()}>
                  Retry
                </button>
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
                        <td data-label="Category"><span className="admin-cell-primary">{label(rate.category)}</span></td>
                        <td data-label="Condition">{label(rate.condition_band)}</td>
                        <td data-label="Rate"><span className="admin-cell-number">{formatPrice(rate.price_bdt)} / {rate.unit}</span></td>
                        <td data-label="Version">
                          <span className="admin-badge" data-status={isCurrent ? 'CURRENT' : 'HISTORICAL'}>
                            {isCurrent ? 'Current' : 'Previous'}
                          </span>
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

function LoadingRows() {
  return (
    <div className="admin-skeleton-list" role="status" aria-label="Loading rate history">
      {[0, 1, 2, 3].map((row) => (
        <div className="admin-skeleton-row" key={row} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((column) => <span className="admin-skeleton-line" key={column} />)}
        </div>
      ))}
    </div>
  );
}
