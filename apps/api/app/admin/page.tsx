// Admin dashboard landing page: introduces the console and links to each management workflow.
import Link from 'next/link';
import { AdminPageHeader } from './components/layout/AdminPageHeader';

export default function AdminDashboardPage() {
  return (
    <>
      {/* Overview header describing the admin console's purpose */}
      <AdminPageHeader
        kicker="Operations workspace"
        title="Keep Chokro's network accurate."
        description="Publish category pricing, register collection drop zones, and make documented partner verification decisions for the circular economy network."
      />

      {/* Workflow index: one clickable card per admin module */}
      <section aria-labelledby="admin-workflows-title">
        <h2 className="admin-section-heading" id="admin-workflows-title">
          Admin workflows
        </h2>
        <p className="admin-section-copy">Choose a workflow to review its live records.</p>

        <div className="admin-module-grid">
          {/* Link to the rate card workflow for publishing pricing */}
          <Link className="admin-module-card" href="/admin/rate-card">
            <span className="admin-module-index">01 / Pricing</span>
            <div>
              <h3 className="admin-module-title">Rate card</h3>
              <p className="admin-module-copy">
                Publish category and condition rates with market-appropriate units, then review every recorded version.
              </p>
              <span className="admin-module-action">Open rate card</span>
            </div>
          </Link>

          {/* Link to the partner verification queue */}
          <Link className="admin-module-card" href="/admin/partners">
            <span className="admin-module-index">02 / Network</span>
            <div>
              <h3 className="admin-module-title">Partner queue</h3>
              <p className="admin-module-copy">
                Inspect capabilities and DoE documentation before approving or rejecting partner applications.
              </p>
              <span className="admin-module-action">Review partners</span>
            </div>
          </Link>

          {/* Link to the drop zone registration workflow */}
          <Link className="admin-module-card" href="/admin/drop-zones">
            <span className="admin-module-index">03 / Collections</span>
            <div>
              <h3 className="admin-module-title">Drop zones</h3>
              <p className="admin-module-copy">
                Register collection points and print the signed QR poster users scan to recognize them.
              </p>
              <span className="admin-module-action">Manage drop zones</span>
            </div>
          </Link>
        </div>
      </section>
    </>
  );
}
