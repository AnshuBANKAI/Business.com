import { config } from '../config.js';
import { runDailyJobs } from './reminders.js';

/** Checks hourly; the job itself guarantees it only does real work once per day. */
export function startScheduler() {
  const tick = async () => {
    try {
      const now = new Date();
      if (now.getHours() < config.REMINDER_HOUR) return;
      const r = await runDailyJobs({ now });
      if (!r.skipped) console.log(`[reminders] ${r.clientEmails} client email(s), owner summary: ${r.digest ? 'sent' : 'none needed'}`);
    } catch (err) {
      console.error('[reminders] failed:', err.message);
    }
  };
  setInterval(tick, 60 * 60 * 1000).unref();
  setTimeout(tick, 30 * 1000).unref(); // shortly after start-up, so a restart never skips a day
  console.log(`Reminders scheduled (daily after ${String(config.REMINDER_HOUR).padStart(2, '0')}:00 server time)`);
}
