// Admin Zone Capacity Telemetry (A03): Real-time fill levels, threshold alerts, and auto-dispatch triggers.
'use client';

import { useState, type FormEvent } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminInput } from '../components/ui/AdminInput';
import { AdminSelect } from '../components/ui/AdminSelect';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage } from '../components/ui/AdminStatusMessage';
import { useAdminNotice } from '../components/ui/AdminNotice';
import {
  useAdminZoneTelemetry,
  useRecordZoneTelemetry,
  type DropZone,
} from '../hooks/useAdminDropZones';
import { formatLabel, getErrorMessage } from '../lib/formatters';

export default function AdminZoneCapacityPage() {
  const { data, isLoading, isError, refetch } = useAdminZoneTelemetry();
  const recordTelemetryMutation = useRecordZoneTelemetry();
  const { showNotice, clearNotice, noticeElement } = useAdminNotice();

  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [fillKgInput, setFillKgInput] = useState<string>('');
  const [triggerReason, setTriggerReason] = useState<string>('DEPOSIT_ACCUMULATION');

  const zones = data?.zones || [];
  const recentLogs = data?.recentLogs || [];
  const metrics = data?.metrics || {
    totalZones: 0,
    criticalZonesCount: 0,
    averageFillPercentage: 0,
    totalFillKg: 0,
    totalCapacityKg: 0,
  };

  async function handleSimulateTelemetry(e: FormEvent) {
    e.preventDefault();
    if (!selectedZoneId) {
      showNotice('error', 'Select a drop zone to update telemetry.');
      return;
    }
    const fillKg = parseFloat(fillKgInput);
    if (isNaN(fillKg) || fillKg < 0) {
      showNotice('error', 'Enter a valid fill amount in kg (non-negative).');
      return;
    }

    try {
      const res = await recordTelemetryMutation.mutateAsync({
        zoneId: selectedZoneId,
        currentFillKg: fillKg,
        triggerReason,
      });

      const dispatchText = res?.dispatchTriggered
        ? ' 🚨 High-capacity threshold (≥85%) reached! Automated pickup dispatch task spawned.'
        : '';

      showNotice('success', `Telemetry recorded successfully.${dispatchText}`);
      setFillKgInput('');
    } catch (err) {
      showNotice('error', getErrorMessage(err, 'Failed to submit telemetry.'));
    }
  }

  function getStatusBadgeTone(status: string) {
    switch (status) {
      case 'OVERFLOW_ALARM':
      case 'FULL':
        return 'danger';
      case 'APPROACHING_CAPACITY':
        return 'warning';
      case 'NORMAL':
      default:
        return 'success';
    }
  }

  function getProgressBarColor(percentage: number) {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 85) return 'bg-amber-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-emerald-500';
  }

  return (
    <>
      <AdminPageHeader
        kicker="Physical-Digital Telemetry (A03)"
        title="Drop-Zone Capacity & Auto-Dispatch"
        description="Monitor real-time drop bin fill levels, track capacity velocity, and inspect automated emptying collection dispatches (≥85% threshold)."
      />

      {noticeElement}

      {/* Metrics Banner */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" aria-label="Telemetry KPI summary">
        <div className="admin-panel p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Drop Bins</div>
          <div className="text-3xl font-black text-slate-900 mt-2">{metrics.totalZones}</div>
          <div className="text-xs text-slate-600 mt-1">Monitored collection points</div>
        </div>

        <div className="admin-panel p-5 border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Critical / Near Full</div>
          <div className="text-3xl font-black text-amber-600 mt-2">{metrics.criticalZonesCount}</div>
          <div className="text-xs text-slate-600 mt-1">Zones at ≥ 85% capacity</div>
        </div>

        <div className="admin-panel p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Network Fill</div>
          <div className="text-3xl font-black text-slate-900 mt-2">{metrics.averageFillPercentage}%</div>
          <div className="text-xs text-slate-600 mt-1">Across all active campus zones</div>
        </div>

        <div className="admin-panel p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Volume Collected</div>
          <div className="text-3xl font-black text-emerald-600 mt-2">{metrics.totalFillKg} kg</div>
          <div className="text-xs text-slate-600 mt-1">of {metrics.totalCapacityKg} kg calibrated capacity</div>
        </div>
      </section>

      {/* Telemetry Sensor / Manual Simulator Panel */}
      <section className="admin-panel mb-8" aria-labelledby="telemetry-simulator-heading">
        <div className="admin-panel-header">
          <div>
            <h2 id="telemetry-simulator-heading" className="admin-section-heading">
              Sensor Telemetry Ingestion & Simulator
            </h2>
            <p className="admin-section-copy">
              Inject weight sensor readings or manual volume audits. Reaching ≥85% triggers automatic collector dispatch.
            </p>
          </div>
        </div>

        <form onSubmit={handleSimulateTelemetry} className="admin-form">
          <div className="admin-form-grid">
            <AdminSelect
              label="Select Drop Zone"
              name="zoneId"
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              options={[
                { value: '', label: 'Choose a drop zone...' },
                ...zones.map((z) => ({
                  value: z.id,
                  label: `${z.name} (${z.institution_id}) — Curr: ${z.current_fill_kg ?? 0}kg / ${z.max_capacity_kg ?? 50}kg (${z.capacity_percentage ?? 0}%)`,
                })),
              ]}
              required
            />

            <AdminInput
              label="Recorded Fill (kg)"
              name="currentFillKg"
              type="number"
              step="0.1"
              min="0"
              placeholder="e.g. 42.5"
              value={fillKgInput}
              onChange={(e) => setFillKgInput(e.target.value)}
              required
            />

            <AdminSelect
              label="Trigger Reason"
              name="triggerReason"
              value={triggerReason}
              onChange={(e) => setTriggerReason(e.target.value)}
              options={[
                { value: 'DEPOSIT_ACCUMULATION', label: 'Deposit Accumulation (Normal Scan)' },
                { value: 'MANUAL_OVERRIDE', label: 'Manual Admin Audit Override' },
                { value: 'COLLECTOR_EMPTYING', label: 'Collector Emptied Bin (Reset)' },
                { value: 'SENSOR_TELEMETRY', label: 'Automated IoT Sensor Telemetry' },
              ]}
              required
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <AdminButton
              variant="secondary"
              type="button"
              onClick={() => {
                if (selectedZoneId) {
                  setFillKgInput('0');
                  setTriggerReason('COLLECTOR_EMPTYING');
                }
              }}
            >
              Set Zero (Bin Emptied)
            </AdminButton>

            <AdminButton
              variant="primary"
              type="submit"
              loading={recordTelemetryMutation.isPending}
            >
              Submit Telemetry
            </AdminButton>
          </div>
        </form>
      </section>

      {/* Live Capacity Gauge Table */}
      <section className="admin-panel mb-8" aria-labelledby="live-capacity-heading">
        <div className="admin-panel-header">
          <div>
            <h2 id="live-capacity-heading" className="admin-section-heading">
              Live Zone Fill Levels
            </h2>
            <p className="admin-section-copy">
              Calibrated limits (C_max) vs current accumulated mass with automated threshold breach flags.
            </p>
          </div>
          <AdminButton variant="secondary" type="button" onClick={() => void refetch()}>
            Refresh
          </AdminButton>
        </div>

        {isLoading ? (
          <AdminSkeleton rowCount={5} colCount={6} />
        ) : isError ? (
          <AdminStatusMessage tone="error">
            Failed to load telemetry data. Please retry.
          </AdminStatusMessage>
        ) : zones.length === 0 ? (
          <div className="admin-empty-state py-12 text-center text-slate-500">
            <p className="font-semibold">No registered drop zones found.</p>
          </div>
        ) : (
          <div className="admin-table-wrap admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Drop Zone</th>
                  <th scope="col">Institution</th>
                  <th scope="col">Current / Max Capacity</th>
                  <th scope="col">Fill Percentage</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last Emptied</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => {
                  const maxCap = Number(zone.max_capacity_kg) || 50;
                  const currFill = Number(zone.current_fill_kg) || 0;
                  const percentage = zone.capacity_percentage ?? Math.round((currFill / maxCap) * 100);
                  const status = zone.capacity_status || (percentage >= 85 ? 'APPROACHING_CAPACITY' : 'NORMAL');
                  const progressColor = getProgressBarColor(percentage);

                  return (
                    <tr key={zone.id}>
                      <td data-label="Drop Zone">
                        <span className="admin-cell-primary font-bold">{zone.name}</span>
                      </td>
                      <td data-label="Institution">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {zone.institution_id}
                        </span>
                      </td>
                      <td data-label="Capacity">
                        <span className="font-semibold">{currFill} kg</span> / {maxCap} kg
                      </td>
                      <td data-label="Fill %" className="min-w-[160px]">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                            <div
                              className={`h-full ${progressColor} transition-all duration-300`}
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold w-10 text-right">{percentage}%</span>
                        </div>
                      </td>
                      <td data-label="Status">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${
                            status === 'OVERFLOW_ALARM' || status === 'FULL'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : status === 'APPROACHING_CAPACITY'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {status === 'APPROACHING_CAPACITY' ? 'NEAR FULL (≥85%)' : status}
                        </span>
                      </td>
                      <td data-label="Last Emptied" className="text-xs text-slate-500">
                        {zone.last_emptied_at
                          ? new Date(zone.last_emptied_at).toLocaleString()
                          : 'Never recorded'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Snapshot Capacity Logs (zone_capacity_logs) */}
      <section className="admin-panel" aria-labelledby="telemetry-logs-heading">
        <div className="admin-panel-header">
          <div>
            <h2 id="telemetry-logs-heading" className="admin-section-heading">
              Recent Snapshot Telemetry History (`zone_capacity_logs`)
            </h2>
            <p className="admin-section-copy">
              Immutable time-series records of capacity changes, deposit accumulation, and auto-dispatches.
            </p>
          </div>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No capacity snapshot logs recorded yet. Ingest telemetry above to view history.
          </div>
        ) : (
          <div className="admin-table-wrap admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Zone</th>
                  <th scope="col">Recorded Fill</th>
                  <th scope="col">Capacity %</th>
                  <th scope="col">Trigger Reason</th>
                  <th scope="col">Status Flag</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td data-label="Timestamp" className="text-xs text-slate-500 font-mono">
                      {new Date(log.loggedAt).toLocaleString()}
                    </td>
                    <td data-label="Zone">
                      <span className="font-semibold">{log.zoneName || log.zoneId}</span>
                    </td>
                    <td data-label="Fill (kg)" className="font-mono">
                      {log.recordedFillKg} kg
                    </td>
                    <td data-label="Capacity %" className="font-bold">
                      {log.capacityPercentage}%
                    </td>
                    <td data-label="Trigger Reason">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {formatLabel(log.triggerReason)}
                      </span>
                    </td>
                    <td data-label="Status Flag">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${
                          log.status === 'OVERFLOW_ALARM' || log.status === 'FULL'
                            ? 'bg-red-100 text-red-700'
                            : log.status === 'APPROACHING_CAPACITY'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {log.status}
                      </span>
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
