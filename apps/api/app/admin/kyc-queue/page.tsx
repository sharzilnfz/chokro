// Admin KYC Adjudication Queue (A06): Side-by-side document intelligence viewer, character diff highlights, and regulatory adjudication toolbar.
'use client';

import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminConfirmModal } from '../components/ui/AdminConfirmModal';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage, type NoticeTone } from '../components/ui/AdminStatusMessage';
import { useAdminKycQueue, useAdjudicateKyc, type KycQueueItem } from '../hooks/useAdminKycQueue';
import { formatLabel, getErrorMessage } from '../lib/formatters';

const KYC_FILTERS = ['ALL', 'PENDING_MATCH', 'EXACT_MATCH', 'PARTIAL_MATCH', 'MISMATCH', 'EXPIRED'] as const;
type KycFilter = (typeof KYC_FILTERS)[number];

type Notice = { tone: NoticeTone; text: string } | null;

interface PendingAdjudication {
  item: KycQueueItem;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_REUPLOAD';
}

export default function AdminKycQueuePage() {
  const [filter, setFilter] = useState<KycFilter>('ALL');
  const [notice, setNotice] = useState<Notice>(null);
  const [selectedExtraction, setSelectedExtraction] = useState<KycQueueItem | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAdjudication | null>(null);
  const [adjudicationNotes, setAdjudicationNotes] = useState<string>('');
  const [grantEwaste, setGrantEwaste] = useState<boolean>(false);
  const [showRawText, setShowRawText] = useState<boolean>(false);

  const { data: queue = [], isLoading, isError, refetch } = useAdminKycQueue(filter);
  const adjudicateMutation = useAdjudicateKyc();

  async function executeAdjudication() {
    if (!pendingAction) return;

    const { item, decision } = pendingAction;
    setNotice(null);

    try {
      await adjudicateMutation.mutateAsync({
        extractionId: item.id,
        decision,
        notes: adjudicationNotes || undefined,
        grantEwasteLicense: decision === 'APPROVE' ? grantEwaste : false,
      });

      setNotice({
        tone: 'success',
        text: `Adjudication recorded: ${item.partnerOrgName} moved to ${decision === 'APPROVE' ? 'Verified' : decision === 'REJECT' ? 'Rejected' : 'Applied (Re-upload requested)'}.`,
      });

      if (selectedExtraction?.id === item.id) {
        setSelectedExtraction(null);
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        text: getErrorMessage(error, `Failed to adjudicate KYC document for ${item.partnerOrgName}.`),
      });
    } finally {
      setPendingAction(null);
      setAdjudicationNotes('');
      setGrantEwaste(false);
    }
  }

  const filteredQueue = queue.filter(
    (item) => filter === 'ALL' || item.matchStatus === filter,
  );

  return (
    <>
      <AdminPageHeader
        kicker="Regulatory Compliance & DoE Licensing"
        title="Partner KYC Adjudication Queue"
        description="Review automated document OCR extractions side-by-side with applicant submissions to verify Bangladesh E-Waste Management Rules compliance."
        actions={
          <div className="admin-filter-bar" role="group" aria-label="Filter KYC extractions">
            {KYC_FILTERS.map((value) => (
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
        }
      />

      {notice && (
        <AdminStatusMessage tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminStatusMessage>
      )}

      {/* Main Queue Table */}
      <section className="admin-panel mb-6" aria-labelledby="kyc-queue-title">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-section-heading" id="kyc-queue-title">
              Document Extractions
            </h2>
            <p className="admin-section-copy">
              Documents are processed by Google Cloud Vision OCR with local regex fallback.
            </p>
          </div>
          {!isLoading && <span className="admin-panel-count">{filteredQueue.length} items</span>}
        </div>

        {isLoading ? (
          <AdminSkeleton rowCount={4} colCount={7} label="Loading KYC queue" />
        ) : isError && queue.length === 0 ? (
          <div className="admin-state">
            <div className="admin-state-content">
              <h3 className="admin-state-title">KYC queue unavailable</h3>
              <p className="admin-state-copy">Could not reach the compliance API. Please retry.</p>
              <AdminButton variant="secondary" type="button" onClick={() => void refetch()}>
                Retry
              </AdminButton>
            </div>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="admin-state">
            <div className="admin-state-content">
              <h3 className="admin-state-title">No pending documents</h3>
              <p className="admin-state-copy">
                {queue.length === 0
                  ? 'No KYC documents have been submitted for OCR verification.'
                  : `No documents currently match the ${formatLabel(filter).toLowerCase()} filter.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="admin-table-wrap admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Partner Organization</th>
                  <th scope="col">Document Type</th>
                  <th scope="col">OCR Match Status</th>
                  <th scope="col">Confidence</th>
                  <th scope="col">Extracted License</th>
                  <th scope="col">Expiration Date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((item) => {
                  const isSelected = selectedExtraction?.id === item.id;
                  const hasDiscrepancy = item.diffs.orgNameMismatch || item.diffs.licenseMismatch || item.diffs.isExpired;

                  return (
                    <tr
                      key={item.id}
                      className={isSelected ? 'bg-emerald-50/50' : hasDiscrepancy ? 'bg-amber-50/20' : undefined}
                    >
                      <td data-label="Partner Organization">
                        <span className="admin-cell-primary font-bold">{item.partnerOrgName}</span>
                        <div className="text-xs text-slate-500">{item.partnerTypes?.join(', ')}</div>
                      </td>
                      <td data-label="Document Type">
                        <AdminBadge>{formatLabel(item.documentType)}</AdminBadge>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.ocrProvider}</div>
                      </td>
                      <td data-label="OCR Match Status">
                        <div>
                          <AdminBadge
                            status={
                              item.matchStatus === 'EXACT_MATCH'
                                ? 'VERIFIED'
                                : item.matchStatus === 'EXPIRED' || item.matchStatus === 'MISMATCH'
                                ? 'REJECTED'
                                : 'APPLIED'
                            }
                          >
                            {formatLabel(item.matchStatus)}
                          </AdminBadge>
                          {item.isExpired && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              EXPIRED
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Confidence">
                        <span className="font-mono text-sm font-semibold">
                          {(item.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td data-label="Extracted License">
                        <div className="font-mono text-xs text-slate-800">
                          {item.extractedLicenseNumber || <span className="text-slate-400">Not detected</span>}
                        </div>
                        {item.diffs.licenseMismatch && (
                          <span className="text-[10px] text-red-600 font-semibold">Mismatch with submitted</span>
                        )}
                      </td>
                      <td data-label="Expiration Date">
                        <div className="text-xs">
                          {item.extractedExpiryDate
                            ? new Date(item.extractedExpiryDate).toLocaleDateString('en-GB')
                            : <span className="text-slate-400">Not stated</span>}
                        </div>
                        {item.isExpired && (
                          <div className="text-[10px] text-red-600 font-bold">Document is expired</div>
                        )}
                      </td>
                      <td data-label="Actions">
                        <div className="flex items-center gap-1.5">
                          <AdminButton
                            variant={isSelected ? 'primary' : 'secondary'}
                            size="sm"
                            type="button"
                            onClick={() => setSelectedExtraction(isSelected ? null : item)}
                          >
                            {isSelected ? 'Close View' : 'Inspect OCR'}
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Side-By-Side Document Inspector (A06) */}
      {selectedExtraction && (
        <section className="admin-panel border-2 border-emerald-500 shadow-md mb-8" aria-labelledby="inspector-title">
          <div className="admin-panel-header bg-slate-900 text-white rounded-t-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">Side-By-Side Document Intelligence Inspector</span>
              <h3 className="text-lg font-extrabold mt-0.5 text-white" id="inspector-title">
                {selectedExtraction.partnerOrgName} — {formatLabel(selectedExtraction.documentType)}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <AdminBadge status={selectedExtraction.matchStatus === 'EXACT_MATCH' ? 'VERIFIED' : 'APPLIED'}>
                {formatLabel(selectedExtraction.matchStatus)}
              </AdminBadge>
              <button
                type="button"
                className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 font-semibold"
                onClick={() => setSelectedExtraction(null)}
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50">
            {/* Left Column: Raw Document & OCR Telemetry */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Document Ingestion</h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Provider: {selectedExtraction.ocrProvider}
                  </span>
                </div>

                <div className="my-4 p-3 bg-slate-100 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Document URL / Reference</span>
                  <p className="font-mono text-xs text-slate-800 break-all">{selectedExtraction.documentUrl}</p>
                </div>

                <div className="my-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase">Extracted OCR Raw Text</span>
                    <button
                      type="button"
                      className="text-xs text-emerald-600 font-semibold hover:underline"
                      onClick={() => setShowRawText(!showRawText)}
                    >
                      {showRawText ? 'Collapse Text' : 'View Full OCR'}
                    </button>
                  </div>
                  <pre
                    className={`p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap ${
                      showRawText ? 'max-h-96' : 'max-h-36'
                    }`}
                  >
                    {selectedExtraction.rawExtractedText || 'No raw text extracted.'}
                  </pre>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                <span>Ingested: {new Date(selectedExtraction.createdAt).toLocaleString()}</span>
                <span>Confidence: {(selectedExtraction.confidenceScore * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* Right Column: Entity Cross-Check & Discrepancy Matrix */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Entity Verification Matrix</h4>
                  <span className="text-xs font-bold text-emerald-700">
                    {selectedExtraction.mismatchedFields.length === 0 ? '✓ No Mismatches' : `⚠ ${selectedExtraction.mismatchedFields.length} Mismatches`}
                  </span>
                </div>

                <div className="space-y-4 my-4">
                  {/* Entity 1: Organization Name */}
                  <div
                    className={`p-3 rounded-xl border ${
                      selectedExtraction.diffs.orgNameMismatch
                        ? 'bg-red-50/80 border-red-300'
                        : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-700">Organization Name</span>
                      {selectedExtraction.diffs.orgNameMismatch ? (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-red-200 text-red-900">MISMATCH</span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">MATCHED</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">Submitted:</span>
                        <strong className="text-slate-900">{selectedExtraction.partnerOrgName}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">Extracted from OCR:</span>
                        <strong className={selectedExtraction.diffs.orgNameMismatch ? 'text-red-700' : 'text-emerald-800'}>
                          {selectedExtraction.extractedOrgName || 'Not detected'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Entity 2: License Number */}
                  <div
                    className={`p-3 rounded-xl border ${
                      selectedExtraction.diffs.licenseMismatch
                        ? 'bg-red-50/80 border-red-300'
                        : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-700">Trade / DoE License Number</span>
                      {selectedExtraction.diffs.licenseMismatch ? (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-red-200 text-red-900">MISMATCH</span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">VERIFIED</span>
                      )}
                    </div>
                    <div className="text-xs">
                      <span className="text-[10px] uppercase text-slate-400 block">Extracted License:</span>
                      <code className="font-mono text-sm font-bold text-slate-800">
                        {selectedExtraction.extractedLicenseNumber || 'Not detected'}
                      </code>
                    </div>
                  </div>

                  {/* Entity 3: Validity & Expiration */}
                  <div
                    className={`p-3 rounded-xl border ${
                      selectedExtraction.isExpired
                        ? 'bg-red-100 border-red-400'
                        : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-700">Permit Expiry Date</span>
                      {selectedExtraction.isExpired ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-600 text-white animate-pulse">EXPIRED</span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">ACTIVE & VALID</span>
                      )}
                    </div>
                    <div className="text-xs">
                      <span className="text-[10px] uppercase text-slate-400 block">Extracted Validity:</span>
                      <strong className={selectedExtraction.isExpired ? 'text-red-800' : 'text-slate-800'}>
                        {selectedExtraction.extractedExpiryDate
                          ? new Date(selectedExtraction.extractedExpiryDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'No expiry date detected'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adjudicate Action Toolbar */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
                <AdminButton
                  variant="primary"
                  type="button"
                  onClick={() => {
                    setAdjudicationNotes('');
                    setGrantEwaste(selectedExtraction.documentType === 'DOE_EWASTE_PERMIT');
                    setPendingAction({ item: selectedExtraction, decision: 'APPROVE' });
                  }}
                >
                  Approve & Verify
                </AdminButton>

                <AdminButton
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setAdjudicationNotes('');
                    setPendingAction({ item: selectedExtraction, decision: 'REQUEST_REUPLOAD' });
                  }}
                >
                  Request Re-upload
                </AdminButton>

                <AdminButton
                  variant="danger"
                  type="button"
                  onClick={() => {
                    setAdjudicationNotes('');
                    setPendingAction({ item: selectedExtraction, decision: 'REJECT' });
                  }}
                >
                  Reject Partner
                </AdminButton>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Confirmation & Adjudication Modal */}
      <AdminConfirmModal
        isOpen={pendingAction !== null}
        title={
          pendingAction?.decision === 'APPROVE'
            ? `Approve KYC for ${pendingAction.item.partnerOrgName}?`
            : pendingAction?.decision === 'REJECT'
            ? `Reject Application of ${pendingAction?.item.partnerOrgName}?`
            : `Request Document Re-upload for ${pendingAction?.item.partnerOrgName}?`
        }
        description={
          <div>
            <p className="text-sm text-slate-600 mb-3">
              {pendingAction?.decision === 'APPROVE'
                ? 'Approving this document will promote the organization to Verified Partner status on the Chokro platform.'
                : pendingAction?.decision === 'REJECT'
                ? 'Rejecting this submission will flag the application as rejected and revoke operational permissions.'
                : 'Requesting a re-upload will notify the partner to submit a clearer or updated copy of their statutory document.'}
            </p>

            {pendingAction?.decision === 'APPROVE' && (
              <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={grantEwaste}
                    onChange={(e) => setGrantEwaste(e.target.checked)}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Grant DoE E-Waste Recycling Licence (`e_waste_licensed`)
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Authorizes this partner to receive, collect, and process hazardous electronic scrap under Bangladesh E-Waste Management Rules 2021.
                    </span>
                  </div>
                </label>
              </div>
            )}

            <div>
              <label htmlFor="adjudication-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Adjudication Notes & Compliance Justification
              </label>
              <textarea
                id="adjudication-notes"
                rows={3}
                className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="e.g. Verified against Department of Environment official registry. Expiry verified 2027."
                value={adjudicationNotes}
                onChange={(e) => setAdjudicationNotes(e.target.value)}
              />
            </div>
          </div>
        }
        confirmLabel={
          pendingAction?.decision === 'APPROVE'
            ? 'Confirm Approval'
            : pendingAction?.decision === 'REJECT'
            ? 'Confirm Rejection'
            : 'Send Re-upload Request'
        }
        confirmVariant={pendingAction?.decision === 'REJECT' ? 'danger' : 'primary'}
        loading={adjudicateMutation.isPending}
        onConfirm={executeAdjudication}
        onCancel={() => {
          setPendingAction(null);
          setAdjudicationNotes('');
          setGrantEwaste(false);
        }}
      />
    </>
  );
}
