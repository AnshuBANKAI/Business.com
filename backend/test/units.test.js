import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.UPLOAD_DIR = './uploads-unit';
const { computeTotals, financialYear } = await import('../src/utils/invoice.js');
const { injectMeta } = await import('../src/seo.js');
const { startupChecks } = await import('../src/config.js');
const T = await import('../src/utils/totp.js');
const { encrypt, decrypt } = await import('../src/utils/secretbox.js');

test('injectMeta keeps "$$" and "$&" in titles literally', () => {
  const html = '<html><head></head><body></body></html>';
  const out = injectMeta(html, { title: 'Save $$ on MVPs $& more', description: "it's $'", canonical: 'https://x.test/', image: 'https://x.test/i.jpg' });
  assert.ok(out.includes('<title>Save $$ on MVPs $&amp; more</title>'));
  assert.equal(out.split('</head>').length, 2);
});

test('export invoice under LUT charges no GST', () => {
  const t = computeTotals([{ qty: 1, rate: 2000 }], 'export_lut', 18);
  assert.deepEqual(t, { subtotal: 2000, cgst: 0, sgst: 0, igst: 0, total: 2000 });
});
test('domestic intra-state GST splits into CGST + SGST', () => {
  const t = computeTotals([{ qty: 1, rate: 50000 }], 'gst_intra', 18);
  assert.deepEqual(t, { subtotal: 50000, cgst: 4500, sgst: 4500, igst: 0, total: 59000 });
});
test('domestic inter-state GST is IGST', () => {
  const t = computeTotals([{ qty: 2, rate: 25000 }], 'gst_inter', 18);
  assert.equal(t.igst, 9000); assert.equal(t.total, 59000);
});
test('rounding is stable for awkward amounts', () => {
  const t = computeTotals([{ qty: 3, rate: 33.33 }, { qty: 1, rate: 0.1 }], 'gst_intra', 18);
  assert.equal(t.subtotal, 100.09); assert.equal(Math.round((t.cgst + t.sgst + t.subtotal) * 100) / 100, t.total);
});
test('financial year follows April–March', () => {
  assert.equal(financialYear(new Date('2026-04-01T10:00:00')), '2026-27');
  assert.equal(financialYear(new Date('2026-03-31T10:00:00')), '2025-26');
  assert.equal(financialYear(new Date('2026-11-06T10:00:00')), '2026-27');
  assert.equal(financialYear(new Date('2099-05-01T10:00:00')), '2099-00');
});
test('meta injection replaces tags, escapes values and keeps JSON-LD inert', () => {
  const html = '<html><head><title>old</title><meta name="description" content="old" /><meta property="og:title" content="old" /></head><body></body></html>';
  const out = injectMeta(html, { title: 'A "quoted" <b>title</b>', description: 'd', canonical: 'https://x.test/', image: 'https://x.test/i.jpg', jsonld: { name: '</script><script>alert(1)</script>' } });
  assert.equal((out.match(/<title>/g) || []).length, 1);
  assert.ok(!out.includes('<b>title</b>'));
  assert.ok(!out.includes('</script><script>'));
  assert.match(out, /rel="canonical" href="https:\/\/x\.test\/"/);
  assert.equal((out.match(/og:title/g) || []).length, 1);
});

// RFC 6238 Appendix B (SHA-1). The shared secret is the ASCII string "12345678901234567890".
const RFC_SECRET = T.base32Encode(Buffer.from('12345678901234567890'));
test('TOTP matches the official RFC 6238 test vectors', () => {
  for (const [time, eight] of [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037']]) {
    assert.equal(T.totp(RFC_SECRET, time * 1000, 8), eight, `T=${time}`);
    assert.equal(T.totp(RFC_SECRET, time * 1000, 6), eight.slice(-6));
  }
});
test('base32 round-trips arbitrary bytes', () => {
  for (const n of [1, 5, 10, 20, 33]) { const b = Buffer.from(Array.from({ length: n }, (_, i) => (i * 37 + n) % 256)); assert.deepEqual(T.base32Decode(T.base32Encode(b)), b); }
  assert.throws(() => T.base32Decode('not*base32'));
});
test('verifyTotp: drift window, wrong codes and replay protection', () => {
  const now = 1234567890 * 1000;
  const code = T.totp(RFC_SECRET, now);
  const step = T.totpStep(now);
  assert.equal(T.verifyTotp(RFC_SECRET, code, { now }), step);
  assert.equal(T.verifyTotp(RFC_SECRET, code, { now: now + 30000 }), step, 'one step of drift is tolerated');
  assert.equal(T.verifyTotp(RFC_SECRET, code, { now: now + 90000 }), null, 'three steps late is rejected');
  assert.equal(T.verifyTotp(RFC_SECRET, code, { now, afterStep: step }), null, 'an already-used step is refused');
  assert.equal(T.verifyTotp(RFC_SECRET, '000000', { now }), null);
  assert.equal(T.verifyTotp(RFC_SECRET, 'abcdef', { now }), null);
  assert.equal(T.verifyTotp(RFC_SECRET, '12345', { now }), null);
});
test('recovery codes: unique, well-formed, normalised before hashing', () => {
  const codes = T.newRecoveryCodes(10);
  assert.equal(new Set(codes).size, 10);
  for (const c of codes) assert.match(c, /^[a-z2-9]{5}-[a-z2-9]{5}$/);
  assert.equal(T.hashRecovery(codes[0]), T.hashRecovery(codes[0].toUpperCase().replace('-', ' ')));
});
test('secretbox encrypts, decrypts and rejects tampering', () => {
  const blob = encrypt('JBSWY3DPEHPK3PXP');
  assert.ok(!blob.includes('JBSWY3DPEHPK3PXP'));
  assert.equal(decrypt(blob), 'JBSWY3DPEHPK3PXP');
  assert.notEqual(encrypt('x'), encrypt('x'), 'fresh IV each time');
  const parts = blob.split('.'); parts[3] = Buffer.from('tampered').toString('base64');
  assert.throws(() => decrypt(parts.join('.')));
});

const GOOD = { NODE_ENV: 'production', JWT_SECRET: 'q8Zr2vN5xK1mP7tW4yB9cD3fG6hJ0aL8sE2uR5oI7nM1', DATA_ENCRYPTION_KEY: 'x'.repeat(40), CRON_SECRET: 'y'.repeat(30), PUBLIC_URL: 'https://example.com', CLIENT_ORIGIN: 'https://example.com', TRUST_PROXY: 1, SMTP_HOST: 'smtp.example.com', OWNER_EMAIL: 'me@example.com', UPLOAD_DIR: '/data/uploads' };
test('startup checks: a correctly configured production setup is silent', () => {
  assert.deepEqual(startupChecks(GOOD), { errors: [], warnings: [] });
});
test('startup checks: development is never nagged', () => {
  assert.deepEqual(startupChecks({ ...GOOD, NODE_ENV: 'development', JWT_SECRET: 'change-me-change-me-change-me-change-me', PUBLIC_URL: 'http://localhost' }), { errors: [], warnings: [] });
});
test('startup checks: placeholder secrets refuse to start in production', () => {
  for (const bad of ['change-me-to-a-long-random-string-of-48-plus-chars', 'test-secret-test-secret-test-secret-123456', 'my-example-secret-key-for-demo-purposes-only']) {
    assert.equal(startupChecks({ ...GOOD, JWT_SECRET: bad }).errors.length, 1, bad);
  }
});
test('startup checks: each risky setting produces a specific warning', () => {
  const w = (over) => startupChecks({ ...GOOD, ...over }).warnings.join(' | ');
  assert.match(w({ PUBLIC_URL: 'http://example.com' }), /not https/);
  assert.match(w({ TRUST_PROXY: 0 }), /TRUST_PROXY/);
  assert.match(w({ SMTP_HOST: undefined }), /SMTP/);
  assert.match(w({ OWNER_EMAIL: undefined }), /OWNER_EMAIL/);
  assert.match(w({ DATA_ENCRYPTION_KEY: undefined }), /DATA_ENCRYPTION_KEY/);
  assert.match(w({ CRON_SECRET: undefined }), /CRON_SECRET/);
  assert.match(w({ UPLOAD_DIR: './uploads' }), /persistent disk/);
  assert.match(w({ CLIENT_ORIGIN: 'https://other.example' }), /CLIENT_ORIGIN/);
});
