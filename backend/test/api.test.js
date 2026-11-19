// These tests need no database: they check routing, validation, auth gates and security headers.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.UPLOAD_DIR = './uploads-test';

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const { createApp } = await import('../src/app.js');
const app = createApp();
after(() => fs.rmSync('./uploads-test', { recursive: true, force: true }));

test('health responds and reports db down', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.db, false);
});

test('security headers are present, x-powered-by is hidden', async () => {
  const res = await request(app).get('/api/health');
  assert.ok(res.headers['content-security-policy']);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('admin and portal APIs reject anonymous requests', async () => {
  for (const url of ['/api/admin/leads', '/api/admin/clients', '/api/admin/stats', '/api/portal/projects']) {
    assert.equal((await request(app).get(url)).status, 401, url);
  }
});

test('forged / wrong-secret tokens are rejected', async () => {
  const forged = jwt.sign({ sub: '64b64b64b64b64b64b64b64b', tv: 0 }, 'attacker-secret-attacker-secret-1234');
  const res = await request(app).get('/api/admin/leads').set('Cookie', `token=${forged}`);
  assert.equal(res.status, 401);
  const none = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMifQ.';
  assert.equal((await request(app).get('/api/admin/leads').set('Cookie', `token=${none}`)).status, 401);
});

test('/auth/me returns user:null when signed out', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 200);
  assert.equal(res.body.user, null);
});

test('login validates input before touching the database', async () => {
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'nope' })).status, 400);
  // NoSQL-operator payloads are rejected by schema validation
  const res = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
  assert.equal(res.status, 400);
});

test('lead form validates fields and silently drops honeypot submissions', async () => {
  const bad = await request(app).post('/api/public/leads').send({ name: '', email: 'x', message: 'hi' });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.fields.email);
  const bot = await request(app).post('/api/public/leads').send({ name: 'Bot', email: 'bot@example.com', message: 'buy cheap things now', website: 'http://spam.example', consent: true });
  assert.equal(bot.status, 201); // no DB write was attempted, otherwise this would 500
});

test('enquiry form requires privacy consent (DPDP)', async () => {
  const res = await request(app).post('/api/public/leads').send({ name: 'A', email: 'a@example.com', message: 'Hello, I need an app built.' });
  assert.equal(res.status, 400);
  assert.match(res.body.fields.consent, /agree to the privacy notice/, 'visitors see a human sentence, not a validator message');
});

test('accept-invite rejects malformed tokens', async () => {
  assert.equal((await request(app).post('/api/auth/accept-invite').send({ token: 'abc', password: 'a-long-password-123' })).status, 400);
  assert.equal((await request(app).get('/api/auth/invite/not-hex')).status, 404);
});

test('cross-origin state-changing requests are blocked', async () => {
  const res = await request(app).post('/api/auth/logout').set('Origin', 'https://evil.example');
  assert.equal(res.status, 403);
});

test('invalid object ids and unknown routes 404 cleanly', async () => {
  assert.equal((await request(app).get('/api/public/projects/Bad_Slug!')).status, 404);
  assert.equal((await request(app).get('/api/nope')).status, 404);
});

test('robots.txt blocks private areas and points to the sitemap', async () => {
  const res = await request(app).get('/robots.txt');
  assert.equal(res.status, 200);
  for (const p of ['/admin', '/portal', '/login', '/api/']) assert.match(res.text, new RegExp(`Disallow: ${p}`));
  assert.match(res.text, /Sitemap: .*\/sitemap\.xml/);
});

test('billing APIs reject anonymous requests', async () => {
  for (const url of ['/api/admin/invoices', '/api/admin/proposals', '/api/portal/invoices', '/api/portal/proposals']) assert.equal((await request(app).get(url)).status, 401, url);
});

test('readiness reports 503 when the database is unreachable, health stays up', async () => {
  assert.equal((await request(app).get('/api/health')).status, 200);
  const r = await request(app).get('/api/ready');
  assert.equal(r.status, 503);
  assert.equal(r.body.ok, false);
});

test('the cron endpoint does not exist unless CRON_SECRET is configured', async () => {
  assert.equal((await request(app).post('/api/cron/daily').set('x-cron-secret', 'anything-at-all-anything-at-all')).status, 404);
});

test('private uploads are not served statically', async () => {
  assert.equal((await request(app).get('/uploads/private/anything.pdf')).status, 404);
});
