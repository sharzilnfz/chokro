// Admin Dynamic Trust Thresholds (A08): Configure fraud detection sensitivity, velocity caps, and audit rates with full version history.
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminInput } from '../components/ui/AdminInput';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage, type NoticeTone } from '../components/ui/AdminStatusMessage';
import {
  useAdminTrustThresholds,
  useUpdateTrustThresholds,
} from '../hooks/useAdminTrustThresholds';
import { formatDate, getErrorMessage } from '../lib/formatters';
import { DEFAULT_TRUST_THRESHOLDS, type TrustThresholdConfig } from '@chokro/shared';

type Notice = { tone: NoticeTone; text: string } | null;

export default function AdminThresholdsPage() {
  const { data, isLoading, isError, refetch } = useAdminTrustThresholds();
  const updateThresholdsMutation = useUpdateTrustThresholds();

  const [notice, setNotice] = useState<Notice>(null);

  // Form state
  const [formState, setFormState] = useState<TrustThresholdConfig>(DEFAULT_TRUST_THRESHOLDS);

  // Re-sync form state when data loads
  useEffect(() => {
    if (data?.thresholds) {
      setFormState({
        ...DEFAULT_TRUST_THRESHOLDS,
        ...data.thresholds,
      });
    }
  }, [data?.thresholds]);

  const history = data?.history || [];

  async function handleSaveThresholds(e: FormEvent) {
    e.preventDefault();
    setNotice(null);

    try {
      await updateThresholdsMutation.mutateAsync(formState);
      setNotice({
        tone: 'success',
        text: 'Trust Gate thresholds updated successfully. New rules are immediately effective.',
      });
    } catch (err) {
      setNotice({
        tone: 'error',
        text: getErrorMessage(err, 'Failed to update trust thresholds.'),
      });
    }
  }

  function handleResetToDefaults() {
    setFormState(DEFAULT_TRUST_THRESHOLDS);
    setNotice({
      tone: 'info',
      text: 'Form reset to system default thresholds. Click "Save changes" to apply.',
    });
  }

  return (
    <>
      <AdminPageHeader
        kicker="Verification & Fraud Surface (A08)"
        title="Dynamic Trust Gate Thresholds"
        description="Configure verification sensitivity, fraud heuristics, velocity caps, and deterministic audit sampling without deploying code."
      />

      {notice && (
        <AdminStatusMessage tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminStatusMessage>
      )}

      <div className="admin-workspace-grid">
        {/* Form Panel */}
        <section className="admin-panel admin-form-panel" aria-labelledby="threshold-form-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="threshold-form-title">
                Active Threshold Configuration
              </h2>
              <p className="admin-section-copy">
                Changes supersede the current record and are tracked in the audit log.
              </p>
            </div>
          </div>

          {isLoading ? (
            <AdminSkeleton rowCount={6} colCount={2} label="Loading threshold configurations" />
          ) : (
            <form className="admin-form" onSubmit={handleSaveThresholds}>
              {/* Photo Hashing & Divergence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminInput
                  id="max-hamming-dist"
                  label="Max Photo Hamming Distance (dHash)"
                  type="number"
                  min="0"
                  max="64"
                  step="1"
                  value={String(formState.max_photo_hamming_distance)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      max_photo_hamming_distance: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  hint="Hamming distance tolerance for near-duplicate photo detection (0 = exact match, 10 = standard near-crop)."
                  required
                />

                <AdminInput
                  id="max-divergence-ratio"
                  label="Max Quantity Divergence Ratio"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={String(formState.max_quantity_divergence_ratio)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      max_quantity_divergence_ratio: parseFloat(e.target.value) || 0,
                    })
                  }
                  hint="Permitted mass divergence between declared and scale verified reading (e.g. 0.25 = 25% tolerance)."
                  required
                />
              </div>

              {/* Geofence & Audit Sampling */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminInput
                  id="geofence-radius"
                  label="Drop-Zone Geofence Radius (meters)"
                  type="number"
                  min="10"
                  step="10"
                  value={String(formState.geofence_radius_meters)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      geofence_radius_meters: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  hint="Maximum distance from drop zone to accept user GPS location without QR session."
                  required
                />

                <AdminInput
                  id="audit-sample-rate"
                  label="Deterministic Audit Sample Rate"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={String(formState.audit_sample_rate)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      audit_sample_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  hint="Proportion of auto-cleared decisions re-queued for audit (e.g. 0.05 = 5%)."
                  required
                />
              </div>

              {/* Velocity Caps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminInput
                  id="max-user-daily-deposits"
                  label="Max User Daily Deposits"
                  type="number"
                  min="1"
                  step="1"
                  value={String(formState.max_user_daily_deposits)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      max_user_daily_deposits: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  hint="Max deposits a single user can make in 24 hours before escalating."
                  required
                />

                <AdminInput
                  id="max-user-daily-credits"
                  label="Max User Daily Credits (BDT)"
                  type="number"
                  min="100"
                  step="100"
                  value={String(formState.max_user_daily_credits_bdt)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      max_user_daily_credits_bdt: parseFloat(e.target.value) || 0,
                    })
                  }
                  hint="Max credit value a single user can earn in 24 hours before escalating."
                  required
                />
              </div>

              {/* Partner Velocity & Pair Collusion */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminInput
                  id="max-partner-confirmations"
                  label="Max Partner Daily Confirmations"
                  type="number"
                  min="1"
                  step="1"
                  value={String(formState.max_partner_daily_confirmations)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      max_partner_daily_confirmations: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  hint="Max pickups or emptyings a collector partner can confirm in 24 hours."
                  required
                />

                <AdminInput
                  id="max-pair-interactions"
                  label="Max Pair Daily Interactions"
                  type="number"
                  min="1"
                  step="1"
                  value={String(formState.max_pair_daily_interactions)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      max_pair_daily_interactions: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  hint="Max handovers between the same user-partner pair per day (collusion detector)."
                  required
                />
              </div>

              {/* Risk & Account Age */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminInput
                  id="min-account-age"
                  label="Min Account Age (Hours)"
                  type="number"
                  min="0"
                  step="1"
                  value={String(formState.min_account_age_hours_for_large_claim)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      min_account_age_hours_for_large_claim: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  hint="Required account age for large claims."
                  required
                />

                <AdminInput
                  id="large-claim-threshold"
                  label="Large Claim Threshold (BDT)"
                  type="number"
                  min="100"
                  step="50"
                  value={String(formState.large_claim_threshold_bdt)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      large_claim_threshold_bdt: parseFloat(e.target.value) || 0,
                    })
                  }
                  hint="Threshold defining a large claim."
                  required
                />

                <AdminInput
                  id="max-fraud-flags"
                  label="Max Active Fraud Flags"
                  type="number"
                  min="0"
                  step="1"
                  value={String(formState.max_active_fraud_flags)}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      max_active_fraud_flags: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  hint="Active flags threshold before escalation."
                  required
                />
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <AdminButton
                  variant="primary"
                  type="submit"
                  loading={updateThresholdsMutation.isPending}
                  loadingText="Saving thresholds..."
                >
                  Save changes
                </AdminButton>

                <AdminButton
                  variant="secondary"
                  type="button"
                  onClick={handleResetToDefaults}
                  disabled={updateThresholdsMutation.isPending}
                >
                  Reset to defaults
                </AdminButton>
              </div>
            </form>
          )}
        </section>

        {/* Audit Log / Version History Panel */}
        <section className="admin-panel" aria-labelledby="threshold-history-title">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-section-heading" id="threshold-history-title">
                Threshold Audit History
              </h2>
              <p className="admin-section-copy">
                Immutable record of threshold changes, effective dates, and actors.
              </p>
            </div>
            {!isLoading && (
              <span className="admin-panel-count">
                {history.length} {history.length === 1 ? 'version' : 'versions'}
              </span>
            )}
          </div>

          {isLoading ? (
            <AdminSkeleton rowCount={4} colCount={4} label="Loading threshold history" />
          ) : isError && history.length === 0 ? (
            <div className="admin-state">
              <div className="admin-state-content">
                <h3 className="admin-state-title">Audit history unavailable</h3>
                <p className="admin-state-copy">Retry when the admin API is available.</p>
                <AdminButton variant="secondary" type="button" onClick={() => void refetch()}>
                  Retry
                </AdminButton>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="admin-state">
              <div className="admin-state-content">
                <h3 className="admin-state-title">No historical threshold changes</h3>
                <p className="admin-state-copy">
                  System is currently operating on baseline default thresholds.
                </p>
              </div>
            </div>
          ) : (
            <div className="admin-table-wrap admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Version ID</th>
                    <th scope="col">Status</th>
                    <th scope="col">Effective From</th>
                    <th scope="col">Divergence Band</th>
                    <th scope="col">pHash Tol.</th>
                    <th scope="col">Audit Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, index) => {
                    const isCurrent = index === 0;
                    const cfg = entry.config_json || {};
                    return (
                      <tr key={entry.id}>
                        <td data-label="Version ID">
                          <span className="font-mono text-xs text-slate-700">
                            {entry.id.slice(0, 8)}...
                          </span>
                        </td>
                        <td data-label="Status">
                          <AdminBadge status={isCurrent ? 'CURRENT' : 'HISTORICAL'}>
                            {isCurrent ? 'Active' : 'Superseded'}
                          </AdminBadge>
                        </td>
                        <td data-label="Effective From">{formatDate(entry.effective_from)}</td>
                        <td data-label="Divergence Band">
                          {cfg.max_quantity_divergence_ratio !== undefined
                            ? `${(cfg.max_quantity_divergence_ratio * 100).toFixed(0)}%`
                            : '—'}
                        </td>
                        <td data-label="pHash Tol.">
                          {cfg.max_photo_hamming_distance ?? '—'}
                        </td>
                        <td data-label="Audit Rate">
                          {cfg.audit_sample_rate !== undefined
                            ? `${(cfg.audit_sample_rate * 100).toFixed(0)}%`
                            : '—'}
                        </td>
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
