import 'dotenv/config';
import cron from 'node-cron';
import { runNotificationJob } from '../lib/notifications/notificationService';

const ONCE = process.argv.includes('--once');
const SCHEDULE = process.env.NOTIFY_CRON || '0 9 * * *'; // daily at 09:00 by default

async function main() {
  if (ONCE) {
    await runNotificationJob();
    process.exit(0);
  }

  console.log(`[notify] daily scheduler started (cron: "${SCHEDULE}"). Press Ctrl+C to stop.`);
  cron.schedule(SCHEDULE, () => {
    runNotificationJob().catch((err) => {
      console.error('[notify] job failed:', err);
    });
  });
}

main().catch((err) => {
  console.error('[notify] fatal:', err);
  process.exit(1);
});