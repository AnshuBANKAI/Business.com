// The sign-in limiter is a brute-force defence, so prove it really bites.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.UPLOAD_DIR = './uploads-rl';
process.env.AUTH_RATE_LIMIT = '3';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import request from 'supertest';
const { createApp } = await import('../src/app.js');
const app = createApp();
after(() => fs.rmSync('./uploads-rl', { recursive: true, force: true }));

test('login attempts beyond the limit get 429 before touching the database', async () => {
  const codes = [];
  for (let i = 0; i < 5; i += 1) codes.push((await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'whatever-123' })).status);
  assert.deepEqual(codes.slice(0, 3).every((c) => c !== 429), true);
  assert.deepEqual(codes.slice(3), [429, 429]);
});
test('the 2FA code endpoint shares the brute-force protection', async () => {
  const codes = [];
  for (let i = 0; i < 6; i += 1) codes.push((await request(app).post('/api/auth/login/2fa').send({ challenge: 'x'.repeat(40), code: '123456' })).status);
  assert.ok(codes.includes(429));
});
