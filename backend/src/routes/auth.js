import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { requireAuth, setSession, clearSession } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { loginSchema, acceptInviteSchema, changePasswordSchema, profileSchema, twoFactorLoginSchema } from '../schemas.js';
import { config } from '../config.js';
import { checkSecondFactor, TF_SELECT } from './twofactor.js';
import twoFactorRoutes from './twofactor.js';
import { HttpError, ah } from '../utils/errors.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.AUTH_RATE_LIMIT, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } });
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 12);
export const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

router.post(
  '/login',
  limiter,
  ah(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email }).select('+passwordHash');
    // Always run bcrypt so response time doesn't reveal whether the email exists.
    const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !user.passwordHash || !ok || !user.active) throw new HttpError(401, 'Incorrect email or password');
    if (user.twoFactor?.enabled) {
      // Password is right, but no session yet: hand back a short-lived challenge that only the 2FA step accepts.
      const challenge = jwt.sign({ sub: user.id, purpose: '2fa' }, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
      return res.json({ needs2fa: true, challenge });
    }
    user.lastLoginAt = new Date();
    await user.save();
    setSession(res, user);
    res.json({ user });
  }),
);

router.post(
  '/login/2fa',
  limiter,
  ah(async (req, res) => {
    const { challenge, code } = twoFactorLoginSchema.parse(req.body);
    let payload;
    try {
      payload = jwt.verify(challenge, config.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      throw new HttpError(401, 'That sign-in expired. Please start again.');
    }
    if (payload.purpose !== '2fa') throw new HttpError(401, 'That sign-in expired. Please start again.');
    const user = await User.findById(payload.sub).select(TF_SELECT);
    if (!user || !user.active || !user.twoFactor?.enabled) throw new HttpError(401, 'That sign-in expired. Please start again.');
    await checkSecondFactor(user, code);
    user.lastLoginAt = new Date();
    await user.save();
    setSession(res, user);
    res.json({ user });
  }),
);

router.use('/2fa', twoFactorRoutes);

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', (req, res, next) =>
  requireAuth(req, res, (err) => {
    if (err && !(err instanceof HttpError)) return next(err);
    res.json({ user: err ? null : req.user });
  }),
);

router.get(
  '/invite/:token',
  limiter,
  ah(async (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) throw new HttpError(404, 'This invite link is not valid');
    const user = await User.findOne({ inviteTokenHash: hashToken(req.params.token), inviteExpires: { $gt: new Date() } }).select('+inviteTokenHash +inviteExpires');
    if (!user) throw new HttpError(404, 'This invite link has expired or was already used');
    res.json({ name: user.name, email: user.email });
  }),
);

router.post(
  '/accept-invite',
  limiter,
  ah(async (req, res) => {
    const { token, password } = acceptInviteSchema.parse(req.body);
    const user = await User.findOne({ inviteTokenHash: hashToken(token), inviteExpires: { $gt: new Date() } }).select('+inviteTokenHash +inviteExpires +passwordHash');
    if (!user || !user.active) throw new HttpError(400, 'This invite link has expired or was already used');
    user.passwordHash = await bcrypt.hash(password, 12);
    user.inviteTokenHash = undefined;
    user.inviteExpires = undefined;
    user.tokenVersion += 1;
    user.lastLoginAt = new Date();
    await user.save();
    setSession(res, user);
    res.json({ user });
  }),
);

router.patch(
  '/profile',
  requireAuth,
  ah(async (req, res) => {
    const data = profileSchema.parse(req.body);
    Object.assign(req.user, data); // only name, company and phone can ever be set here
    await req.user.save();
    res.json({ user: req.user });
  }),
);

router.post(
  '/change-password',
  limiter,
  requireAuth,
  ah(async (req, res) => {
    const { current, next } = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await bcrypt.compare(current, user.passwordHash || DUMMY_HASH))) throw new HttpError(400, 'Current password is incorrect');
    user.passwordHash = await bcrypt.hash(next, 12);
    user.tokenVersion += 1; // signs out every other device
    await user.save();
    setSession(res, user);
    res.json({ ok: true });
  }),
);

export default router;
