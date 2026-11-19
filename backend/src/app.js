import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { config } from './config.js';
import { originGuard, errorHandler, notFoundHandler } from './middleware/common.js';
import { publicDir } from './utils/files.js';
import { PRIVATE_PREFIXES, robotsTxt, sitemapXml, rssXml, metaFor, injectMeta } from './seo.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import portalRoutes from './routes/portal.js';
import cronRoutes from './routes/cron.js';

mongoose.set('bufferCommands', false); // fail fast instead of hanging if the DB is down
mongoose.set('strictQuery', true);

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.TRUST_PROXY) app.set('trust proxy', config.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", 'blob:'],
          connectSrc: ["'self'"],
          frameSrc: ["'self'"],
          objectSrc: ["'self'"],
          workerSrc: ["'self'", 'blob:'],
          formAction: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.use(compression());
  // Minimal access log in production: method, path (no query string, which can carry tokens), status, time. No bodies, no cookies.
  if (config.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      const t0 = process.hrtime.bigint();
      res.on('finish', () => {
        const path = req.originalUrl.split('?')[0]; // full path, never the query string (it can carry tokens)
        if (path === '/api/health' || path === '/api/ready' || path.startsWith('/assets/')) return;
        console.log(`${req.method} ${path} ${res.statusCode} ${Math.round(Number(process.hrtime.bigint() - t0) / 1e6)}ms`);
      });
      next();
    });
  }
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false, skip: (req) => !req.path.startsWith('/api') }));

  // Only the public folder is served statically; client files live in /private and need an authenticated route.
  app.use('/uploads/public', express.static(publicDir, { index: false, maxAge: '7d', dotfiles: 'ignore' }));

  app.get('/robots.txt', (req, res) => res.type('text/plain').send(robotsTxt()));
  app.get('/sitemap.xml', async (req, res) => {
    try {
      res.type('application/xml').send(await sitemapXml());
    } catch {
      res.status(503).type('text/plain').send('Sitemap temporarily unavailable');
    }
  });

  app.get('/rss.xml', async (req, res) => {
    try {
      res.type('application/rss+xml').send(await rssXml());
    } catch {
      res.status(503).type('text/plain').send('Feed temporarily unavailable');
    }
  });

  // /api/health: is the process up (for uptime monitors). /api/ready: can it actually serve (503 if the database is down).
  app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
  app.get('/api/ready', (req, res) => {
    const ok = mongoose.connection.readyState === 1;
    res.status(ok ? 200 : 503).json({ ok, db: ok });
  });
  app.use('/api/cron', cronRoutes); // called by schedulers, which send no Origin header
  app.use('/api', originGuard());
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/portal', portalRoutes);
  app.use('/api', notFoundHandler);

  // In production the same server serves the built React app.
  const dist = path.resolve(here, '../../frontend/dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }));
    app.use(express.static(dist, { index: false, maxAge: '1d' }));
    const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
    app.get('*', async (req, res, next) => {
      // Real files and API paths must 404 properly instead of receiving the app shell.
      if (req.path.startsWith('/uploads/') || req.path.startsWith('/assets/') || /\.[a-z0-9]{2,5}$/i.test(req.path)) return next();
      res.set('Cache-Control', 'no-cache');
      const isPrivate = PRIVATE_PREFIXES.some((p) => req.path === p || req.path.startsWith(`${p}/`));
      if (isPrivate) {
        res.set('X-Robots-Tag', 'noindex, nofollow');
        return res.type('html').send(shell);
      }
      // Public pages get real <title>, description, Open Graph tags and JSON-LD in the HTML itself,
      // so search engines and link previews (WhatsApp, LinkedIn) don't depend on running JavaScript.
      const pathname = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
      try {
        const meta = await metaFor(pathname);
        if (meta) return res.type('html').send(injectMeta(shell, meta));
      } catch (err) {
        console.error('meta injection failed:', err.message);
        return res.type('html').send(shell);
      }
      // Unknown public URL: still serve the app (it shows its own "not found" page) but with a real 404 status.
      return res.status(404).type('html').send(shell);
    });
  }

  app.use((req, res) => res.status(404).type('text/plain').send('Not found'));
  app.use(errorHandler);
  return app;
}
