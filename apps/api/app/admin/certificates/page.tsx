// Admin ESG Certificates & Institutional Sustainability (A12)
'use client';

import { useState, type FormEvent } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage, type NoticeTone } from '../components/ui/AdminStatusMessage';
import { AdminInput } from '../components/ui/AdminInput';
import { AdminSelect } from '../components/ui/AdminSelect';
import {
  useAdminCertificates,
  useAdminEwasteCompliance,
  useGenerateCertificate,
  type AdminCertificateListItem,
} from '../hooks/useAdminCertificates';
import { useAdminCampuses } from '../hooks/useAdminCampuses';
import { getErrorMessage } from '../lib/formatters';

type Tab = 'CERTIFICATES' | 'EWASTE_COMPLIANCE';
type Notice = { tone: NoticeTone; text: string } | null;

export default function AdminCertificatesPage() {
  const [tab, setTab] = useState<Tab>('CERTIFICATES');
  const [notice, setNotice] = useState<Notice>(null);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: certificates = [], isLoading: loadingCerts, refetch: refetchCerts } = useAdminCertificates();
  const { data: compliance, isLoading: loadingCompliance, refetch: refetchCompliance } = useAdminEwasteCompliance();
  const { data: campuses = [] } = useAdminCampuses('VERIFIED');
  const generateMutation = useGenerateCertificate();

  async function handleGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedCampusId || !periodStart || !periodEnd) {
      setNotice({ tone: 'error', text: 'Please select an institution and reporting date range.' });
      return;
    }

    setNotice(null);
    setIsGenerating(true);

    try {
      const cert = await generateMutation.mutateAsync({
        institutionId: selectedCampusId,
        periodStart,
        periodEnd,
      });

      setNotice({
        tone: 'success',
        text: `ESG Sustainability Certificate "${cert?.certificate_ref || 'Created'}" generated and signed successfully.`,
      });
      setSelectedCampusId('');
      setPeriodStart('');
      setPeriodEnd('');
      void refetchCerts();
    } catch (error) {
      setNotice({
        tone: 'error',
        text: getErrorMessage(error, 'Could not generate certificate.'),
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        kicker="ESG & Institutional Value"
        title="ESG Certificates & Compliance (A12)"
        description="Generate cryptographic SHA-256 signed sustainability certificates for institutional partners and audit DoE e-waste chain of custody."
        actions={
          <div className="admin-filter-bar" role="group" aria-label="View tabs">
            <button
              type="button"
              className={`admin-filter-button ${tab === 'CERTIFICATES' ? 'active' : ''}`}
              aria-pressed={tab === 'CERTIFICATES'}
              onClick={() => setTab('CERTIFICATES')}
            >
              Issued Certificates ({certificates.length})
            </button>
            <button
              type="button"
              className={`admin-filter-button ${tab === 'EWASTE_COMPLIANCE' ? 'active' : ''}`}
              aria-pressed={tab === 'EWASTE_COMPLIANCE'}
              onClick={() => setTab('EWASTE_COMPLIANCE')}
            >
              DoE E-Waste Compliance
            </button>
          </div>
        }
      />

      {notice && (
        <AdminStatusMessage tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminStatusMessage>
      )}

      {tab === 'CERTIFICATES' ? (
        <>
          {/* Certificate Generation Panel */}
          <section className="admin-panel mb-8" aria-labelledby="generate-cert-heading">
            <h2 id="generate-cert-heading" className="admin-heading-2">
              Generate New Sustainability Certificate
            </h2>
            <p className="admin-muted text-sm mb-4">
              Issues an immutable, SHA-256 signed document freezing the verified custody record set for an institution.
            </p>

            <form onSubmit={handleGenerate} className="admin-form">
              <div className="admin-form-grid">
                <AdminSelect
                  label="Institution / Campus"
                  name="institutionId"
                  value={selectedCampusId}
                  onChange={(e) => setSelectedCampusId(e.target.value)}
                  options={[
                    { value: '', label: 'Select verified campus...' },
                    ...campuses.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.slug})`,
                    })),
                  ]}
                  required
                />
                <AdminInput
                  label="Period Start Date"
                  name="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
                <AdminInput
                  label="Period End Date"
                  name="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </div>

              <div className="mt-4 flex justify-end">
                <AdminButton variant="primary" type="submit" loading={isGenerating}>
                  Generate Signed Certificate
                </AdminButton>
              </div>
            </form>
          </section>

          {/* Certificates Table */}
          <section className="admin-panel" aria-labelledby="certificates-table-heading">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="certificates-table-heading" className="admin-heading-2">
                  Issued Certificates
                </h2>
                <p className="admin-muted text-sm">
                  Cryptographically signed documents verifiable at /api/v1/certificates/[ref]
                </p>
              </div>
              <AdminButton variant="secondary" type="button" onClick={() => void refetchCerts()}>
                Refresh
              </AdminButton>
            </div>

            {loadingCerts ? (
              <AdminSkeleton rowCount={4} colCount={6} />
            ) : certificates.length === 0 ? (
              <div className="admin-empty-state py-12 text-center text-slate-500">
                <p className="font-semibold">No sustainability certificates issued yet.</p>
                <p className="text-sm mt-1">Select a campus and reporting date range above to generate a certificate.</p>
              </div>
            ) : (
              <div className="admin-table-wrap admin-table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Certificate Ref</th>
                      <th scope="col">Institution</th>
                      <th scope="col">Reporting Period</th>
                      <th scope="col">Mass Diverted</th>
                      <th scope="col">Avoided CO₂e</th>
                      <th scope="col">Records Covered</th>
                      <th scope="col">Issued At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert) => {
                      const periodStr = `${new Date(cert.period_start).toLocaleDateString('en-GB')} — ${new Date(cert.period_end).toLocaleDateString('en-GB')}`;
                      const issuedStr = new Date(cert.issued_at).toLocaleDateString('en-GB');

                      return (
                        <tr key={cert.id}>
                          <td data-label="Certificate Ref">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {cert.certificate_ref}
                            </span>
                          </td>
                          <td data-label="Institution">
                            <span className="admin-cell-primary font-bold">
                              {cert.institution_name || cert.institution_slug || 'Campus'}
                            </span>
                          </td>
                          <td data-label="Reporting Period">
                            <span className="text-xs text-slate-700">{periodStr}</span>
                          </td>
                          <td data-label="Mass Diverted">
                            <span className="font-bold text-emerald-800">{Number(cert.total_mass_kg).toFixed(1)} kg</span>
                          </td>
                          <td data-label="Avoided CO₂e">
                            <span className="font-bold text-teal-800">-{Number(cert.total_co2e_kg).toFixed(2)} kg CO₂e</span>
                          </td>
                          <td data-label="Records Covered">
                            <AdminBadge>{cert.covered_record_ids?.length || 0} events</AdminBadge>
                          </td>
                          <td data-label="Issued At">
                            <span className="text-xs text-slate-500">{issuedStr}</span>
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
      ) : (
        /* DoE E-Waste Compliance Panel */
        <section className="admin-panel" aria-labelledby="ewaste-compliance-heading">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="ewaste-compliance-heading" className="admin-heading-2">
                Department of Environment (DoE) E-Waste Regulatory Report
              </h2>
              <p className="admin-muted text-sm">
                Evidences licensed downstream partner destination and mandatory human review for hazardous electronics.
              </p>
            </div>
            <AdminButton variant="secondary" type="button" onClick={() => void refetchCompliance()}>
              Refresh
            </AdminButton>
          </div>

          {loadingCompliance ? (
            <AdminSkeleton rowCount={4} colCount={5} />
          ) : (
            <>
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total E-Waste Items</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">{compliance?.totalItems ?? 0}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total E-Waste Mass</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">{compliance?.totalMassKg ?? 0} kg</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Licensed Partner %</div>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                    {compliance?.licensedPartnerPercentage ?? 100}%
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">Flagged Audit Gaps</div>
                  <div className="text-2xl font-extrabold text-amber-700 mt-1">{compliance?.flaggedGapsCount ?? 0}</div>
                </div>
              </div>

              {/* Compliance Table */}
              {!compliance?.items || compliance.items.length === 0 ? (
                <div className="admin-empty-state py-12 text-center text-slate-500">
                  <p className="font-semibold">No e-waste disposal records recorded yet.</p>
                  <p className="text-sm mt-1">Verified electronic deposits and pickups will appear here with license evidence.</p>
                </div>
              ) : (
                <div className="admin-table-wrap admin-table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th scope="col">Custody ID</th>
                        <th scope="col">Type & Mass</th>
                        <th scope="col">Licensed Partner Destination</th>
                        <th scope="col">DoE Permit Doc</th>
                        <th scope="col">Reviewer / Decision</th>
                        <th scope="col">Chain Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compliance.items.map((item) => (
                        <tr key={item.impactRecordId}>
                          <td data-label="Custody ID">
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {item.custodyId.slice(0, 8)}...
                            </span>
                          </td>
                          <td data-label="Type & Mass">
                            <div>
                              <span className="font-bold text-slate-900">{item.massKg} kg</span>
                              <div className="text-xs text-slate-500">{item.custodyType}</div>
                            </div>
                          </td>
                          <td data-label="Licensed Partner Destination">
                            <div>
                              <span className="font-bold text-slate-900">{item.destinationPartnerName}</span>
                              <div className="text-xs">
                                <AdminBadge status={item.isLicensedPartner ? 'LICENSED' : 'MISSING'}>
                                  {item.isLicensedPartner ? 'DoE Licensed' : 'Unlicensed'}
                                </AdminBadge>
                              </div>
                            </div>
                          </td>
                          <td data-label="DoE Permit Doc">
                            <span className="text-xs font-mono text-slate-600">
                              {item.destinationDoeLicenseDoc || 'No document attached'}
                            </span>
                          </td>
                          <td data-label="Reviewer / Decision">
                            <div>
                              <span className="text-xs font-bold text-slate-800">{item.decidedBy}</span>
                              <div className="text-[11px] text-slate-500">
                                {new Date(item.decidedAt).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                          </td>
                          <td data-label="Chain Status">
                            <AdminBadge status={item.chainComplete ? 'ACTIVE' : 'REJECTED'}>
                              {item.chainComplete ? 'Complete Chain' : 'Audit Gap'}
                            </AdminBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
