import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { HttpError } from '../utils/errors.js';
import { config, isProd } from '../config.js';

/** Reject cross-origin state-changing requests (defence in depth on top of SameSite cookies). */
export function originGuard() {
  const allowed = new Set(
    [config.CLIENT_ORIGIN, config.PUBLIC_URL].map((u) => {
      try {
        return new URL(u).origin;
      } catch {
        return u;
      }
    }),
  );
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && !allowed.has(origin)) return next(new HttpError(403, 'Origin not allowed'));
    next();
  };
}

export const validId = (...names) => (req, res, next) => {
  for (const n of names) {
    if (!mongoose.isValidObjectId(req.params[n])) return next(new HttpError(404, 'Not found'));
  }
  next();
};

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Please check the highlighted fields',
      fields: Object.fromEntries(err.issues.map((i) => [i.path.join('.') || 'form', i.message])),
    });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is larger than 10 MB' });
  if (err?.name === 'MulterError') return res.status(400).json({ error: 'Upload failed' });
  if (err?.code === 11000) return res.status(409).json({ error: 'That value already exists' });
  if (err instanceof mongoose.Error.ValidationError) return res.status(400).json({ error: err.message });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  console.error(err);
  res.status(500).json({ error: isProd ? 'Something went wrong' : String(err?.message || err) });
}
