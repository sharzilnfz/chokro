import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="admin-page-kicker">Operations workspace</p>
          <h1 className="admin-page-title">Keep Chokro&apos;s network accurate.</h1>
          <p className="admin-page-description">
            Publish category pricing and make documented partner verification decisions for the Sprint 1 network.
          </p>
        </div>
      </header>

      <section aria-labelledby="admin-workflows-title">
        <h2 className="admin-section-heading" id="admin-workflows-title">Admin workflows</h2>
        <p className="admin-section-copy">Choose a workflow to review its live records.</p>

        <div className="admin-module-grid">
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
