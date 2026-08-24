// Seeds local development data: demo accounts per role, partner orgs, baseline rates, commodity benchmarks, pickup routes, auction lots, drop zones, verified deposits, trust decisions, bilateral negotiations, reverse demands, KYC extractions, institutional ESG certificates, and campus leaderboards.
import { runSeed } from './seed/index';

runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
