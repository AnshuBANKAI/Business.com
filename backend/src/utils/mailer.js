import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transport = null;
if (config.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
  });
}

/** Never throws: a mail failure must not break the request that triggered it. Resolves true if sent (or logged), false if not. */
export async function sendMail({ to, subject, text }) {
  if (!to) return false;
  if (!transport) {
    console.log(`[mail:console] to=${to} subject="${subject}"\n${text}\n`);
    return true;
  }
  try {
    await transport.sendMail({ from: config.MAIL_FROM, to, subject, text });
    return true;
  } catch (err) {
    console.error('[mail] failed:', err.message);
    return false; // callers that track "already reminded" only record true
  }
}

export const notifyOwner = (subject, text) => sendMail({ to: config.OWNER_EMAIL, subject, text });
