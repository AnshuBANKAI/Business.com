// With CRON_SECRET set, the endpoint must reject everything except the exact secret (checked before any database work).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.UPLOAD_DIR = './uploads-cron';
process.env.CRON_SECRET = 'cron-secret-cron-secret-1234567';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import request from 'supertest';
const { createApp } = await import('../src/app.js');
const app = createApp();
after(() => fs.rmSync('./uploads-cron', { recursive: true, force: true }));

test('missing, wrong, near-miss and wrong-length secrets are all rejected', async () => {
  for (const hdr of [undefined, '', 'nope', 'cron-secret-cron-secret-1234568', 'cron-secret-cron-secret-123456', 'cron-secret-cron-secret-12345678']) {
    const r = hdr === undefined ? request(app).post('/api/cron/daily') : request(app).post('/api/cron/daily').set('x-cron-secret', hdr);
    assert.equal((await r).status, 401, String(hdr));
  }
});
test('the secret in the query string or body is not accepted', async () => {
  assert.equal((await request(app).post('/api/cron/daily?x-cron-secret=cron-secret-cron-secret-1234567')).status, 401);
  assert.equal((await request(app).post('/api/cron/daily').send({ secret: 'cron-secret-cron-secret-1234567' })).status, 401);
});
test('GET is not allowed', async () => {
  assert.equal((await request(app).get('/api/cron/daily').set('x-cron-secret', 'cron-secret-cron-secret-1234567')).status, 404);
});
