// Admin campuses page: register universities, review pending student submissions, and manage blacklisted institutions.
'use client';

import {
  DIVISIONS,
  CAMPUS_STATUSES,
  type Campus,
  type CampusStatus,
  type Division,
} from '@chokro/shared';
import { useRef, useState, type FormEvent } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { AdminBadge } from '../components/ui/AdminBadge';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminConfirmModal } from '../components/ui/AdminConfirmModal';
import { AdminInput } from '../components/ui/AdminInput';
import { AdminSelect } from '../components/ui/AdminSelect';
import { AdminSkeleton } from '../components/ui/AdminSkeleton';
import { AdminStatusMessage, type NoticeTone } from '../components/ui/AdminStatusMessage';
import {
  useAdminCampuses,
  useCreateCampus,
  useUpdateCampusStatus,
  useRemoveCampus,
} from '../hooks/useAdminCampuses';
import { formatLabel, getErrorMessage } from '../lib/formatters';

const FILTERS = ['ALL', ...CAMPUS_STATUSES] as const;
type Filter = (typeof FILTERS)[number];

type Notice = { tone: NoticeTone; text: string } | null;

type ModalAction =
  | { type: 'VERIFY'; campus: Campus }
  | { type: 'BLACKLIST'; campus: Campus }
  | { type: 'REMOVE'; campus: Campus }
  | null;

export default function AdminCampusesPage() {
  const { data: campuses = [], isLoading, isError, refetch } = useAdminCampuses();
  const createCampusMutation = useCreateCampus();
  const updateStatusMutation = useUpdateCampusStatus();
  const removeCampusMutation = useRemoveCampus();
  const formRef = useRef<HTMLFormElement>(null);

  const [filter, setFilter] = useState<Filter>('ALL');
  const [notice, setNotice] = useState<Notice>(null);
  const [division, setDivision] = useState<Division>('DHAKA');
  const [modalAction, setModalAction] = useState<ModalAction>(null);
  const [blacklistReason, setBlacklistReason] = useState('');

  // Filtered campuses based on active tab
  const filteredCampuses = campuses.filter((c) => {
    if (filter === 'ALL') return true;
    return (c.status || 'VERIFIED') === filter;
  });

  const pendingCount = campuses.filter((c) => c.status === 'PENDING').length;
  const blacklistedCount = campuses.filter((c) => c.status === 'BLACKLISTED').length;
  const verifiedCount = campuses.filter((c) => (c.status || 'VERIFIED') === 'VERIFIED').length;

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') || '').trim();
    const zilla = String(formData.get('zilla') || '').trim();
    const upazilla = String(formData.get('upazilla') || '').trim();
    const slug = String(formData.get('slug') || '').trim();

    if (!name || !zilla || !upazilla) {
      setNotice({ tone: 'error', text: 'Name, zilla, and upazilla are required.' });
      return;
    }

    try {
      const created = await createCampusMutation.mutateAsync({
        name,
        division,
        zilla,
        upazilla,
        slug: slug ? slug.toUpperCase() : undefined,
        status: 'VERIFIED',
      });

      setNotice({
        tone: 'success',
        text: `Campus "${created?.name ?? name}" registered successfully as Verified with code ${created?.slug ?? slug}.`,
      });
      formRef.current?.reset();
      setDivision('DHAKA');
    } catch (error) {
      setNotice({
        tone: 'error',
        text: getErrorMessage(error, 'Could not register campus.'),
      });
    }
  }

  async function handleExecuteModalAction() {
    if (!modalAction) return;
    setNotice(null);

    try {
      if (modalAction.type === 'VERIFY') {
        await updateStatusMutation.mutateAsync({
          id: modalAction.campus.id,
          status: 'VERIFIED',
        });
        setNotice({
          tone: 'success',
          text: `Campus "${modalAction.campus.name}" is now verified. Students can now join and earn leaderboard points.`,
        });
      } else if (modalAction.type === 'BLACKLIST') {
        await updateStatusMutation.mutateAsync({
          id: modalAction.campus.id,
          status: 'BLACKLISTED',
          reason: blacklistReason.trim() || undefined,
        });
        setNotice({
          tone: 'success',
          text: `Campus "${modalAction.campus.name}" has been blacklisted.`,
        });
      } else if (modalAction.type === 'REMOVE') {
        await removeCampusMutation.mutateAsync(modalAction.campus.id);
        setNotice({
          tone: 'success',
          text: `Campus "${modalAction.campus.name}" removed successfully.`,
        });
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        text: getErrorMessage(error, 'Could not complete campus action.'),
      });
    } finally {
      setModalAction(null);
      setBlacklistReason('');
    }
  }

  return (
    <>
      <AdminPageHeader
        kicker="Network operations"
        title="Campuses"
        description="Register universities/colleges, verify pending student submissions, and manage blacklisted institutions."
      />

      {notice && (
        <AdminStatusMessage tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AdminStatusMessage>
      )}

      {/* Manual campus creation panel */}
      <section className="admin-panel mb-8" aria-labelledby="add-campus-heading">
        <h2 id="add-campus-heading" className="admin-heading-2">
          Register new campus
        </h2>
        <p className="admin-muted text-sm mb-4">
          Add an educational institution directly with Verified status.
        </p>

        <form ref={formRef} onSubmit={handleCreate} className="admin-form">
          <div className="admin-form-grid">
            <AdminInput
              label="Campus name"
              name="name"
              placeholder="e.g. North South University"
              required
            />
            <AdminSelect
              label="Division"
              name="division"
              value={division}
              onChange={(e) => setDivision(e.target.value as Division)}
              options={DIVISIONS.map((d) => ({
                value: d,
                label: formatLabel(d),
              }))}
              required
            />
            <AdminInput
              label="District / Zilla"
              name="zilla"
              placeholder="e.g. Dhaka"
              required
            />
            <AdminInput
              label="Upazilla / Thana / Area"
              name="upazilla"
              placeholder="e.g. Bashundhara R/A"
              required
            />
            <AdminInput
              label="Campus code (slug)"
              name="slug"
              placeholder="e.g. NSU (auto-derived if empty)"
              hint="Optional 2–8 letter code. Auto-derived from name if omitted."
            />
          </div>

          <div className="mt-4 flex justify-end">
            <AdminButton
              variant="primary"
              type="submit"
              loading={createCampusMutation.isPending}
            >
              Register verified campus
            </AdminButton>
          </div>
        </form>
      </section>

      {/* Filter Tabs */}
      <div className="admin-filter-bar mb-6" role="tablist" aria-label="Campus status filters">
        {FILTERS.map((f) => {
          const count =
            f === 'ALL'
              ? campuses.length
              : f === 'PENDING'
              ? pendingCount
              : f === 'BLACKLISTED'
              ? blacklistedCount
              : verifiedCount;

          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`admin-filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {formatLabel(f)}
              <span className="admin-filter-count ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Campus Table */}
      <section className="admin-panel" aria-labelledby="campus-list-heading">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="campus-list-heading" className="admin-heading-2">
              {filter === 'ALL'
                ? 'All Campuses'
                : filter === 'PENDING'
                ? 'Pending Student Campus Requests'
                : filter === 'BLACKLISTED'
                ? 'Blacklisted Institutions'
                : 'Verified Campuses'}
            </h2>
            <p className="admin-muted text-sm">
              {filteredCampuses.length} institution(s) listed
            </p>
          </div>
          <AdminButton variant="secondary" type="button" onClick={() => void refetch()}>
            Refresh
          </AdminButton>
        </div>

        {isLoading ? (
          <AdminSkeleton rowCount={5} />
        ) : isError ? (
          <AdminStatusMessage tone="error">
            Failed to load campuses. Please check your connection and refresh.
          </AdminStatusMessage>
        ) : filteredCampuses.length === 0 ? (
          <div className="admin-empty-state py-12 text-center text-slate-500">
            <p className="font-semibold">No campuses found in this category.</p>
            <p className="text-sm mt-1">
              {filter === 'PENDING'
                ? 'No student-submitted campuses currently waiting for review.'
                : filter === 'BLACKLISTED'
                ? 'There are no blacklisted campuses.'
                : 'Register a campus above to get started.'}
            </p>
          </div>
        ) : (
          <div className="admin-table-container overflow-x-auto">
            <table className="admin-table w-full text-left">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Division</th>
                  <th>Location</th>
                  <th>Status</th>
                  {filter === 'BLACKLISTED' && <th>Blacklist Reason</th>}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampuses.map((c) => {
                  const status = c.status || 'VERIFIED';
                  return (
                    <tr key={c.id}>
                      <td data-label="Name">
                        <span className="admin-cell-primary font-bold">{c.name}</span>
                      </td>
                      <td data-label="Code">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {c.slug}
                        </span>
                      </td>
                      <td data-label="Division">{formatLabel(c.division)}</td>
                      <td data-label="Location">
                        {c.zilla}
                        {c.upazilla ? `, ${c.upazilla}` : ''}
                      </td>
                      <td data-label="Status">
                        <AdminBadge
                          status={
                            status === 'VERIFIED'
                              ? 'ACTIVE'
                              : status === 'PENDING'
                              ? 'APPLIED'
                              : 'REJECTED'
                          }
                        >
                          {status}
                        </AdminBadge>
                      </td>
                      {filter === 'BLACKLISTED' && (
                        <td data-label="Blacklist Reason" className="text-sm text-red-600 max-w-xs truncate">
                          {c.reason || 'No reason provided'}
                        </td>
                      )}
                      <td data-label="Actions" className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {status === 'PENDING' && (
                            <>
                              <AdminButton
                                variant="primary"
                                type="button"
                                onClick={() => setModalAction({ type: 'VERIFY', campus: c })}
                              >
                                Verify & Approve
                              </AdminButton>
                              <AdminButton
                                variant="danger"
                                type="button"
                                onClick={() => setModalAction({ type: 'BLACKLIST', campus: c })}
                              >
                                Blacklist
                              </AdminButton>
                            </>
                          )}

                          {status === 'VERIFIED' && (
                            <>
                              <AdminButton
                                variant="danger"
                                type="button"
                                onClick={() => setModalAction({ type: 'BLACKLIST', campus: c })}
                              >
                                Blacklist
                              </AdminButton>
                              <AdminButton
                                variant="secondary"
                                type="button"
                                onClick={() => setModalAction({ type: 'REMOVE', campus: c })}
                              >
                                Remove
                              </AdminButton>
                            </>
                          )}

                          {status === 'BLACKLISTED' && (
                            <>
                              <AdminButton
                                variant="primary"
                                type="button"
                                onClick={() => setModalAction({ type: 'VERIFY', campus: c })}
                              >
                                Restore to Verified
                              </AdminButton>
                              <AdminButton
                                variant="danger"
                                type="button"
                                onClick={() => setModalAction({ type: 'REMOVE', campus: c })}
                              >
                                Remove
                              </AdminButton>
                            </>
                          )}
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

      {/* Confirmation modal for Verify / Blacklist / Remove */}
      <AdminConfirmModal
        isOpen={Boolean(modalAction)}
        title={
          modalAction?.type === 'VERIFY'
            ? `Verify "${modalAction.campus.name}"?`
            : modalAction?.type === 'BLACKLIST'
            ? `Blacklist "${modalAction.campus.name}"?`
            : `Remove "${modalAction?.campus.name}"?`
        }
        description={
          modalAction?.type === 'VERIFY' ? (
            <span>
              This will mark <strong>{modalAction.campus.name}</strong> as an officially verified campus.
              Linked students will immediately be included in the Inter-Campus Circularity Leaderboards.
            </span>
          ) : modalAction?.type === 'BLACKLIST' ? (
            <div>
              <p className="mb-3">
                Blacklisting <strong>{modalAction.campus.name}</strong> will exclude it from all leaderboards
                and prevent new students from joining this campus.
              </p>
              <div>
                <label htmlFor="blacklist-reason" className="block text-xs font-semibold text-slate-700 mb-1">
                  Blacklist Reason (Optional note)
                </label>
                <textarea
                  id="blacklist-reason"
                  rows={3}
                  className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="e.g. Unverified institution, suspected spam submission, or policy violation."
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <span>
              Are you sure you want to remove <strong>{modalAction?.campus.name}</strong> ({modalAction?.campus.slug})?
              Campuses with linked student accounts cannot be removed.
            </span>
          )
        }
        confirmLabel={
          modalAction?.type === 'VERIFY'
            ? 'Verify Campus'
            : modalAction?.type === 'BLACKLIST'
            ? 'Blacklist Campus'
            : 'Remove Campus'
        }
        confirmVariant={modalAction?.type === 'VERIFY' ? 'primary' : 'danger'}
        loading={updateStatusMutation.isPending || removeCampusMutation.isPending}
        onConfirm={handleExecuteModalAction}
        onCancel={() => {
          setModalAction(null);
          setBlacklistReason('');
        }}
      />
    </>
  );
}
