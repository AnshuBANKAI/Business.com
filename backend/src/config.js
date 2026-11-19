import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Optional. Encrypts 2FA seeds. If unset, JWT_SECRET is used (then changing JWT_SECRET forces everyone to re-enrol 2FA).
  DATA_ENCRYPTION_KEY: z.string().min(32).optional(),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_URL: z.string().default('http://localhost:5173'),
  // Max sign-in / invite / 2FA attempts per IP per 15 minutes. Lower is stricter.
  AUTH_RATE_LIMIT: z.coerce.number().int().min(1).default(15),
  // Daily reminder job. Runs once a day after REMINDER_HOUR (server time; set TZ=Asia/Kolkata on the host for IST).
  ENABLE_SCHEDULER: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  REMINDER_HOUR: z.coerce.number().int().min(0).max(23).default(9),
  // Lets an external scheduler trigger the daily reminders (POST /api/cron/daily) when the host sleeps. Unset = endpoint disabled.
  CRON_SECRET: z.string().min(24, 'CRON_SECRET must be at least 24 characters').optional(),
  TRUST_PROXY: z.coerce.number().default(0),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  OWNER_EMAIL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Anshu Sharma <no-reply@localhost>'),
  UPLOAD_DIR: z.string().default('./uploads'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const i of parsed.error.issues) console.error(` - ${i.path.join('.')}: ${i.message}`);
  process.exit(1);
}

export const config = parsed.data;

/** Production safety review. `errors` stop the server from starting; `warnings` are printed at boot. */
export function startupChecks(c) {
  const errors = [];
  const warnings = [];
  if (c.NODE_ENV !== 'production') return { errors, warnings };
  if (/change-me|example|secret-secret|test-secret/i.test(c.JWT_SECRET)) errors.push('JWT_SECRET looks like a placeholder. Generate a real one: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  if (!/^https:\/\//i.test(c.PUBLIC_URL)) warnings.push('PUBLIC_URL is not https. Session cookies are marked Secure in production, so sign-in will not work over plain http.');
  try { if (new URL(c.CLIENT_ORIGIN).origin !== new URL(c.PUBLIC_URL).origin) warnings.push('CLIENT_ORIGIN differs from PUBLIC_URL. In production both should be your site URL.'); } catch { warnings.push('CLIENT_ORIGIN or PUBLIC_URL is not a valid URL.'); }
  if (!c.TRUST_PROXY) warnings.push('TRUST_PROXY is 0. Behind a host or load balancer set TRUST_PROXY=1, otherwise every visitor shares one IP and the rate limits will lock real users out.');
  if (!c.SMTP_HOST) warnings.push('SMTP is not configured. Invitations, invoices and reminders will only be written to the log and nobody will receive them.');
  if (!c.OWNER_EMAIL) warnings.push('OWNER_EMAIL is not set. New-lead alerts and the daily summary have nowhere to go (unless your email is saved in Site settings).');
  if (!c.DATA_ENCRYPTION_KEY) warnings.push('DATA_ENCRYPTION_KEY is not set, so 2FA secrets are encrypted with JWT_SECRET. Rotating JWT_SECRET would then force everyone to re-enrol 2FA. Set a separate key.');
  if (!c.CRON_SECRET) warnings.push('CRON_SECRET is not set. If your host puts the server to sleep, reminders will only run when someone wakes it. Set it and trigger POST /api/cron/daily from a scheduler.');
  if (c.UPLOAD_DIR === './uploads') warnings.push('UPLOAD_DIR is the default relative folder. Make sure it is on a persistent disk, or uploaded files vanish on redeploy.');
  return { errors, warnings };
}
export const isProd = config.NODE_ENV === 'production';
