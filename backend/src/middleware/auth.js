import jwt from 'jsonwebtoken';
import { config, isProd } from '../config.js';
import { User } from '../models/User.js';
import { HttpError, ah } from '../utils/errors.js';

const COOKIE = 'token';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function setSession(res, user) {
  const token = jwt.sign({ sub: user.id, tv: user.tokenVersion }, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: WEEK, path: '/' });
}

export const clearSession = (res) => res.clearCookie(COOKIE, { path: '/' });

export const requireAuth = ah(async (req, res, next) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new HttpError(401, 'Not signed in');
  let payload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Session expired');
  }
  if (payload.purpose) throw new HttpError(401, 'Session expired'); // e.g. a 2FA challenge token is not a session
  const user = await User.findById(payload.sub);
  // tokenVersion lets us revoke every session for a user (password reset, deactivation).
  if (!user || !user.active || user.tokenVersion !== payload.tv) throw new HttpError(401, 'Session expired');
  req.user = user;
  next();
});

export const requireRole = (role) => (req, res, next) =>
  req.user?.role === role ? next() : next(new HttpError(403, 'Forbidden'));
