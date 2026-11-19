// Locked out of your own account? Run this from the server's shell (anyone who can run it already controls the server).
//   npm run recover -- you@example.com                -> prints a one-time "set a new password" link (valid 7 days)
//   npm run recover -- you@example.com --reset-2fa    -> also turns off two-factor sign-in so you can sign in and re-enrol
// Either way every existing session for that account is signed out.
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { User } from '../models/User.js';

const [email, ...flags] = process.argv.slice(2);
if (!email || email.startsWith('--')) {
  console.error('Usage: npm run recover -- <email> [--reset-2fa]');
  process.exit(2);
}

await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+inviteTokenHash +inviteExpires');
if (!user) {
  console.error(`No account found for ${email}`);
  await mongoose.disconnect();
  process.exit(1);
}

const raw = crypto.randomBytes(32).toString('hex');
user.inviteTokenHash = crypto.createHash('sha256').update(raw).digest('hex');
user.inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
user.active = true;
user.tokenVersion += 1;
if (flags.includes('--reset-2fa')) {
  user.twoFactor = { enabled: false, recoveryHashes: [], lastStep: -1, failedCount: 0 };
  console.log('Two-factor sign-in turned off. Re-enrol from the Account page after you sign in.');
}
await user.save();
console.log(`Set a new password here (valid 7 days, works once):\n${config.PUBLIC_URL.replace(/\/$/, '')}/accept-invite?token=${raw}`);
await mongoose.disconnect();
