import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../config.js';
import { HttpError, ah } from '../utils/errors.js';
import { runDailyJobs } from '../jobs/reminders.js';

const router = Router();

/**
 * For hosts that put the server to sleep. A scheduler (cron-job.org, UptimeRobot, Render Cron...) calls
 *   POST /api/cron/daily   with header   x-cron-secret: <CRON_SECRET>
 * The job itself only does real work once per day and never re-sends a reminder, so extra calls are harmless.
 */
router.post('/daily', (req, res, next) => {
  if (!config.CRON_SECRET) return next(new HttpError(404, 'Not found')); // disabled unless configured
  const given = Buffer.from(String(req.get('x-cron-secret') || ''));
  const want = Buffer.from(config.CRON_SECRET);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return next(new HttpError(401, 'Unauthorized'));
  next();
}, ah(async (req, res) => res.json(await runDailyJobs())));

export default router;
