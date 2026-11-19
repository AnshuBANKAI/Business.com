import { Router } from 'express';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { requireAuth, setSession } from '../middleware/auth.js';
import { twoFactorSetupSchema, twoFactorEnableSchema, twoFactorConfirmSchema } from '../schemas.js';
import { HttpError, ah } from '../utils/errors.js';
import { encrypt, decrypt } from '../utils/secretbox.js';
import { newSecret, otpauthUri, verifyTotp, newRecoveryCodes, hashRecovery } from '../utils/totp.js';

const ISSUER = 'Anshu Sharma';
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
export const TF_SELECT = '+passwordHash +twoFactor.secretEnc +twoFactor.pendingSecretEnc +twoFactor.recoveryHashes +twoFactor.lastStep +twoFactor.failedCount +twoFactor.lockedUntil';

export const tfLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.AUTH_RATE_LIMIT + 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } });

/**
 * Checks an authenticator code or a one-time recovery code. Mutates (does not save) the user:
 * the caller saves. Wrong codes count toward a lock-out; a used time-step can never be replayed.
 */
export async function checkSecondFactor(user, code, now = Date.now()) {
  const tf = user.twoFactor;
  if (tf.lockedUntil && tf.lockedUntil.getTime() > now) throw new HttpError(429, 'Too many wrong codes. Try again in a few minutes.');
  const given = String(code).trim();
  let ok = false;
  if (/^\d{6}$/.test(given)) {
    const step = verifyTotp(decrypt(tf.secretEnc), given, { now, afterStep: tf.lastStep });
    if (step !== null) { tf.lastStep = step; ok = true; }
  } else {
    const idx = tf.recoveryHashes.indexOf(hashRecovery(given));
    if (idx >= 0) { tf.recoveryHashes.splice(idx, 1); ok = true; } // each recovery code works once
  }
  if (!ok) {
    tf.failedCount += 1;
    if (tf.failedCount >= MAX_FAILS) { tf.lockedUntil = new Date(now + LOCK_MS); tf.failedCount = 0; }
    await user.save();
    throw new HttpError(401, 'That code is not valid');
  }
  tf.failedCount = 0;
  tf.lockedUntil = undefined;
}

async function loadWithSecrets(id) {
  return User.findById(id).select(TF_SELECT);
}
async function assertPassword(user, password) {
  if (!(await bcrypt.compare(password, user.passwordHash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi'))) throw new HttpError(400, 'Password is incorrect');
}

const router = Router();
router.use(tfLimiter, requireAuth);

// Step 1 — needs the password again, so a hijacked session can't quietly attach the attacker's authenticator.
router.post('/setup', ah(async (req, res) => {
  const { password } = twoFactorSetupSchema.parse(req.body);
  const user = await loadWithSecrets(req.user._id);
  await assertPassword(user, password);
  if (user.twoFactor.enabled) throw new HttpError(409, 'Two-factor sign-in is already on');
  const secret = newSecret();
  user.twoFactor.pendingSecretEnc = encrypt(secret);
  await user.save();
  const uri = otpauthUri({ secret, account: user.email, issuer: ISSUER });
  res.json({ secret, otpauthUri: uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) });
}));

// Step 2 — prove the app works by entering a live code; only then is it switched on.
router.post('/enable', ah(async (req, res) => {
  const { code } = twoFactorEnableSchema.parse(req.body);
  const user = await loadWithSecrets(req.user._id);
  if (user.twoFactor.enabled) throw new HttpError(409, 'Two-factor sign-in is already on');
  if (!user.twoFactor.pendingSecretEnc) throw new HttpError(400, 'Start setup first');
  const step = verifyTotp(decrypt(user.twoFactor.pendingSecretEnc), code);
  if (step === null) throw new HttpError(400, 'That code is not valid. Check the time on your phone and try the next code.');
  const codes = newRecoveryCodes();
  Object.assign(user.twoFactor, { enabled: true, secretEnc: user.twoFactor.pendingSecretEnc, pendingSecretEnc: undefined, recoveryHashes: codes.map(hashRecovery), lastStep: step, failedCount: 0 });
  user.tokenVersion += 1; // signs out every other device
  await user.save();
  setSession(res, user);
  res.json({ recoveryCodes: codes });
}));

router.post('/disable', ah(async (req, res) => {
  const { password, code } = twoFactorConfirmSchema.parse(req.body);
  const user = await loadWithSecrets(req.user._id);
  await assertPassword(user, password);
  if (!user.twoFactor.enabled) throw new HttpError(409, 'Two-factor sign-in is not on');
  await checkSecondFactor(user, code);
  Object.assign(user.twoFactor, { enabled: false, secretEnc: undefined, pendingSecretEnc: undefined, recoveryHashes: [], lastStep: -1, failedCount: 0, lockedUntil: undefined });
  user.tokenVersion += 1;
  await user.save();
  setSession(res, user);
  res.json({ ok: true });
}));

router.post('/recovery-codes', ah(async (req, res) => {
  const { password, code } = twoFactorConfirmSchema.parse(req.body);
  const user = await loadWithSecrets(req.user._id);
  await assertPassword(user, password);
  if (!user.twoFactor.enabled) throw new HttpError(409, 'Two-factor sign-in is not on');
  await checkSecondFactor(user, code);
  const codes = newRecoveryCodes();
  user.twoFactor.recoveryHashes = codes.map(hashRecovery); // the old set stops working
  await user.save();
  res.json({ recoveryCodes: codes });
}));

export default router;
