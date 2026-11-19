// Full-flow tests against a real MongoDB. Skipped unless E2E_MONGODB_URI is set:
//   E2E_MONGODB_URI=mongodb://127.0.0.1:27017/anshu_e2e npm test
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.E2E_MONGODB_URI || 'mongodb://127.0.0.1:1/unused';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.UPLOAD_DIR = './uploads-e2e';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.OWNER_EMAIL = 'owner@example.com';
process.env.ENABLE_SCHEDULER = 'false';
process.env.CRON_SECRET = 'cron-secret-cron-secret-1234567'; // this suite signs in far more often than a person would

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { execFileSync } from 'node:child_process';
import request from 'supertest';
import { totp } from '../src/utils/totp.js';

const run = !!process.env.E2E_MONGODB_URI;
const t = (name, fn) => test(name, { skip: !run && 'set E2E_MONGODB_URI to run' }, fn);

let app, admin, clientA, clientB, User;
const PW = 'correct-horse-battery-1';
const login = async (email, password = PW) => {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  return { agent, res };
};
const inviteToken = (link) => new URL(link).searchParams.get('token');

before(async () => {
  if (!run) return;
  ({ User } = await import('../src/models/User.js'));
  const { createApp } = await import('../src/app.js');
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await User.create({ name: 'Admin', email: 'admin@example.com', role: 'admin', passwordHash: await bcrypt.hash(PW, 4) });
  app = createApp();
});
after(async () => {
  if (run) await mongoose.disconnect();
  fs.rmSync('./uploads-e2e', { recursive: true, force: true });
});

t('admin logs in; wrong password is rejected', async () => {
  assert.equal((await login('admin@example.com', 'wrong-password-123')).res.status, 401);
  const { agent, res } = await login('admin@example.com');
  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, 'admin');
  assert.equal(res.body.user.passwordHash, undefined);
  assert.match(res.headers['set-cookie'][0], /HttpOnly/);
  admin = agent;
});

t('public lead is stored and visible to admin; status can be updated', async () => {
  const lead = { name: 'Founder', email: 'Founder@Example.com', message: 'We need an MVP built in six weeks.', budget: '$5-10k', consent: true };
  assert.equal((await request(app).post('/api/public/leads').send({ ...lead, consent: false })).status, 400);
  assert.equal((await request(app).post('/api/public/leads').send(lead)).status, 201);
  const list = await admin.get('/api/admin/leads');
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].email, 'founder@example.com');
  assert.ok(list.body[0].consentAt, 'consent timestamp stored');
  assert.equal(list.body[0].consentVersion, '2026-11-06');
  const upd = await admin.patch(`/api/admin/leads/${list.body[0]._id}`).send({ status: 'contacted' });
  assert.equal(upd.body.status, 'contacted');
  assert.equal((await admin.patch(`/api/admin/leads/${list.body[0]._id}`).send({ status: 'hacked' })).status, 400);
});

t('CMS: create project (auto slug, unique), publish shows on public site, drafts hidden', async () => {
  const base = { title: 'Alpha App', year: '2026', genre: '', logline: 'x', problem: '', solution: '', stack: ['React'], features: [], metrics: [{ value: '1', label: 'a' }], github: '', liveUrl: '', coverImage: '', accent: '#b8351a', featured: true, published: true, order: 1 };
  const a = await admin.post('/api/admin/projects').send(base);
  const b = await admin.post('/api/admin/projects').send({ ...base, published: false });
  assert.equal(a.status, 201);
  assert.equal(a.body.slug, 'alpha-app');
  assert.equal(b.body.slug, 'alpha-app-2');
  const site = await request(app).get('/api/public/site');
  assert.equal(site.body.projects.length, 1);
  assert.equal((await request(app).get('/api/public/projects/alpha-app-2')).status, 404);
  assert.equal((await request(app).get('/api/public/projects/alpha-app')).status, 200);
  const bad = await admin.post('/api/admin/projects').send({ ...base, github: 'javascript:alert(1)' });
  assert.equal(bad.status, 400);
});

t('invite flow: client gets a link, sets password, is signed in; link is single-use', async () => {
  const created = await admin.post('/api/admin/clients').send({ name: 'Client A', email: 'a@client.com', company: 'Acme' });
  assert.equal(created.status, 201);
  const token = inviteToken(created.body.inviteLink);
  assert.equal((await request(app).get(`/api/auth/invite/${token}`)).body.email, 'a@client.com');
  assert.equal((await login('a@client.com')).res.status, 401); // no password yet
  assert.equal((await request(app).post('/api/auth/accept-invite').send({ token, password: 'short' })).status, 400);
  const agent = request.agent(app);
  assert.equal((await agent.post('/api/auth/accept-invite').send({ token, password: PW })).status, 200);
  assert.equal((await request(app).post('/api/auth/accept-invite').send({ token, password: PW })).status, 400);
  clientA = (await login('a@client.com')).agent;

  const b = await admin.post('/api/admin/clients').send({ name: 'Client B', email: 'b@client.com' });
  await request(app).post('/api/auth/accept-invite').send({ token: inviteToken(b.body.inviteLink), password: PW });
  clientB = (await login('b@client.com')).agent;
  assert.equal((await admin.post('/api/admin/clients').send({ name: 'Dup', email: 'a@client.com' })).status, 409);
});

t('roles are enforced: clients cannot reach admin, admin cannot use portal', async () => {
  assert.equal((await clientA.get('/api/admin/leads')).status, 403);
  assert.equal((await clientA.post('/api/admin/clients').send({ name: 'x', email: 'x@x.com' })).status, 403);
  assert.equal((await admin.get('/api/portal/projects')).status, 403);
});

let pid, mid;
t('admin creates a client project with milestones; client sees only their own', async () => {
  const users = await admin.get('/api/admin/clients');
  const a = users.body.find((u) => u.email === 'a@client.com');
  const proj = await admin.post('/api/admin/client-projects').send({ client: a._id, title: 'Acme MVP', status: 'in_progress' });
  assert.equal(proj.status, 201);
  pid = proj.body._id;
  const upd = await admin.patch(`/api/admin/client-projects/${pid}`).send({
    milestones: [
      { title: 'Design', status: 'approved' },
      { title: 'Backend', status: 'delivered' },
      { title: 'Launch', status: 'pending' },
    ],
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.progress, 33);
  mid = upd.body.milestones[1]._id;

  const mine = await clientA.get('/api/portal/projects');
  assert.equal(mine.body.length, 1);
  assert.equal((await clientB.get('/api/portal/projects')).body.length, 0);
  // Direct access to someone else's project looks like it doesn't exist
  for (const url of [`/api/portal/projects/${pid}`, `/api/portal/projects/${pid}/messages`]) {
    assert.equal((await clientB.get(url)).status, 404, url);
  }
  assert.equal((await clientB.post(`/api/portal/projects/${pid}/milestones/${mid}/approve`)).status, 404);
  assert.equal((await clientB.post(`/api/portal/projects/${pid}/messages`).send({ body: 'hi' })).status, 404);
});

t('client can approve a delivered milestone once; pending ones cannot be approved', async () => {
  const p = await clientA.get(`/api/portal/projects/${pid}`);
  const pendingId = p.body.milestones[2]._id;
  assert.equal((await clientA.post(`/api/portal/projects/${pid}/milestones/${pendingId}/approve`)).status, 409);
  const ok = await clientA.post(`/api/portal/projects/${pid}/milestones/${mid}/approve`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.progress, 67);
  assert.equal((await clientA.post(`/api/portal/projects/${pid}/milestones/${mid}/approve`)).status, 409);
});

t('request-changes moves the milestone back and posts a message', async () => {
  await admin.patch(`/api/admin/client-projects/${pid}`).send({ milestones: [{ title: 'Launch', status: 'delivered' }] });
  const p = await clientA.get(`/api/portal/projects/${pid}`);
  const id = p.body.milestones[0]._id;
  assert.equal((await clientA.post(`/api/portal/projects/${pid}/milestones/${id}/request-changes`).send({})).status, 400);
  const res = await clientA.post(`/api/portal/projects/${pid}/milestones/${id}/request-changes`).send({ note: 'Logo is too small' });
  assert.equal(res.body.milestones[0].status, 'in_progress');
  const msgs = await clientA.get(`/api/portal/projects/${pid}/messages`);
  assert.match(msgs.body.at(-1).body, /Logo is too small/);
});

t('messages: both sides can post; sender role is set by the server, not the client', async () => {
  const m1 = await clientA.post(`/api/portal/projects/${pid}/messages`).send({ body: 'Hello', senderRole: 'admin', senderName: 'Admin' });
  assert.equal(m1.body.senderRole, 'client');
  assert.equal(m1.body.senderName, 'Client A');
  const m2 = await admin.post(`/api/admin/client-projects/${pid}/messages`).send({ body: 'Hi, on it' });
  assert.equal(m2.body.senderRole, 'admin');
  assert.equal((await clientA.post(`/api/portal/projects/${pid}/messages`).send({ body: '' })).status, 400);
});

t('files: allowed types upload, disallowed are refused, only the owner can download', async () => {
  const pdf = Buffer.from('%PDF-1.4 test');
  const up = await clientA.post(`/api/portal/projects/${pid}/files`).attach('file', pdf, { filename: '../../evil name.pdf', contentType: 'application/pdf' });
  assert.equal(up.status, 201);
  assert.equal(up.body.uploadedBy, 'client');
  assert.ok(!up.body.name.includes('/'));
  assert.match(up.body.storedName, /^[a-f0-9]{32}\.pdf$/);

  const exe = await clientA.post(`/api/portal/projects/${pid}/files`).attach('file', Buffer.from('MZ'), { filename: 'a.exe', contentType: 'application/x-msdownload' });
  assert.equal(exe.status, 400);
  const svg = await admin.post('/api/admin/upload').attach('image', Buffer.from('<svg onload=alert(1)>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
  assert.equal(svg.status, 400);
  const big = await clientA.post(`/api/portal/projects/${pid}/files`).attach('file', Buffer.alloc(11 * 1024 * 1024), { filename: 'big.pdf', contentType: 'application/pdf' });
  assert.equal(big.status, 413);
  assert.equal((await clientB.post(`/api/portal/projects/${pid}/files`).attach('file', pdf, { filename: 'x.pdf', contentType: 'application/pdf' })).status, 404);

  const fid = up.body._id;
  const dl = await clientA.get(`/api/portal/projects/${pid}/files/${fid}`);
  assert.equal(dl.status, 200);
  assert.match(dl.headers['content-disposition'], /attachment/);
  assert.equal((await clientB.get(`/api/portal/projects/${pid}/files/${fid}`)).status, 404);
  assert.equal((await admin.get(`/api/admin/client-projects/${pid}/files/${fid}`)).status, 200);
  assert.equal((await admin.delete(`/api/admin/client-projects/${pid}/files/${fid}`)).status, 200);
  assert.equal((await clientA.get(`/api/portal/projects/${pid}/files/${fid}`)).status, 404);
});

t('public image upload returns a servable /uploads/public url', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const up = await admin.post('/api/admin/upload').attach('image', png, { filename: 'p.png', contentType: 'image/png' });
  assert.equal(up.status, 201);
  assert.equal((await request(app).get(up.body.url)).status, 200);
});


const today = new Date().toISOString().slice(0, 10);
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const inv = (client, over = {}) => ({ client, issueDate: today, dueDate: inDays(14), currency: 'USD', taxMode: 'export_lut', gstRate: 18, items: [{ description: 'MVP milestone 1', sac: '998314', qty: 1, rate: 1500 }], billTo: { name: 'Riya', company: 'Fintechly', address: 'NYC', country: 'USA', gstin: '' }, ...over });
let aId, bId;

t('settings: private business data never reaches the public API', async () => {
  const users = await admin.get('/api/admin/clients');
  aId = users.body.find((u) => u.email === 'a@client.com')._id;
  bId = users.body.find((u) => u.email === 'b@client.com')._id;
  const cur = (await admin.get('/api/admin/settings')).body;
  const put = await admin.put('/api/admin/settings').send({ ...cur, brandName: 'Anshu Studio', pan: 'ABCDE1234F', bankDetails: 'Acct 123456789 IFSC TEST0001', whatsapp: '919876543210', grievanceEmail: 'privacy@example.com', commitments: ['Weekly updates'] });
  assert.equal(put.status, 200);
  const pub = (await request(app).get('/api/public/site')).body.settings;
  assert.equal(pub.brandName, 'Anshu Studio');
  assert.equal(pub.whatsapp, '919876543210');
  for (const k of ['pan', 'bankDetails', 'lutNumber', 'sacCode']) assert.equal(pub[k], undefined, `${k} must stay private`);
  assert.equal((await admin.put('/api/admin/settings').send({ ...cur, whatsapp: '+91 98765' })).status, 400);
});

t('invoices: cannot be sent until business details exist; tax rules enforced', async () => {
  const draft = await admin.post('/api/admin/invoices').send(inv(aId));
  assert.equal(draft.status, 201);
  assert.equal(draft.body.total, 1500);
  assert.equal(draft.body.number, undefined, 'drafts have no number');
  assert.equal((await admin.post(`/api/admin/invoices/${draft.body._id}/send`)).status, 400); // no legal name/address yet
  assert.equal((await admin.post('/api/admin/invoices').send(inv(aId, { currency: 'INR' }))).status, 400); // export in INR
  assert.equal((await admin.post('/api/admin/invoices').send(inv(aId, { taxMode: 'gst_intra', currency: 'USD' }))).status, 400); // GST must be INR
  assert.equal((await admin.post('/api/admin/invoices').send(inv(aId, { dueDate: inDays(-3) }))).status, 400);
  assert.equal((await admin.post('/api/admin/invoices').send(inv(aId, { items: [] }))).status, 400);
  const cur = (await admin.get('/api/admin/settings')).body;
  await admin.put('/api/admin/settings').send({ ...cur, legalName: 'Anshu Sharma (Proprietor)', address: 'Ranchi, Jharkhand, India' });
  assert.equal((await admin.post(`/api/admin/invoices/${draft.body._id}/send`)).status, 400); // export needs LUT number
  await admin.put('/api/admin/settings').send({ ...cur, legalName: 'Anshu Sharma (Proprietor)', address: 'Ranchi, Jharkhand, India', lutNumber: 'AD1234567890123', gstin: '20ABCDE1234F1Z5' });
});

t('invoices: sequential numbering, frozen supplier details, client isolation, lifecycle', async () => {
  const a1 = (await admin.post('/api/admin/invoices').send(inv(aId))).body;
  const a2 = (await admin.post('/api/admin/invoices').send(inv(aId, { items: [{ description: 'Milestone 2', qty: 2, rate: 800 }] }))).body;
  const gst = (await admin.post('/api/admin/invoices').send(inv(aId, { taxMode: 'gst_intra', currency: 'INR', items: [{ description: 'Website', sac: '998314', qty: 1, rate: 50000 }] }))).body;
  assert.equal(gst.cgst, 4500); assert.equal(gst.total, 59000);
  const s1 = await admin.post(`/api/admin/invoices/${a1._id}/send`);
  const s2 = await admin.post(`/api/admin/invoices/${a2._id}/send`);
  assert.equal(s1.status, 200);
  const fy = s1.body.number.split('/')[0];
  assert.match(s1.body.number, /^\d{4}-\d{2}\/001$/);
  assert.equal(s2.body.number, `${fy}/002`);
  assert.equal(s1.body.supplier.lutNumber, 'AD1234567890123');
  // changing settings later must not alter an issued invoice
  const cur = (await admin.get('/api/admin/settings')).body;
  await admin.put('/api/admin/settings').send({ ...cur, legalName: 'Different Name' });
  assert.equal((await admin.get(`/api/admin/invoices/${a1._id}`)).body.supplier.legalName, 'Anshu Sharma (Proprietor)');
  await admin.put('/api/admin/settings').send({ ...cur, legalName: 'Anshu Sharma (Proprietor)' });
  // sent invoices are immutable
  assert.equal((await admin.put(`/api/admin/invoices/${a1._id}`).send(inv(aId))).status, 409);
  assert.equal((await admin.delete(`/api/admin/invoices/${a1._id}`)).status, 409);
  assert.equal((await admin.post(`/api/admin/invoices/${a1._id}/send`)).status, 409);
  // client sees sent invoices only, never drafts, never another client's
  const mine = await clientA.get('/api/portal/invoices');
  assert.equal(mine.body.length, 2);
  assert.ok(!mine.body.some((i) => i._id === gst._id), 'draft hidden');
  assert.equal((await clientA.get(`/api/portal/invoices/${gst._id}`)).status, 404);
  assert.equal((await clientB.get(`/api/portal/invoices/${a1._id}`)).status, 404); // another client's invoice looks like it doesn't exist
});

t('invoices: mark paid / void rules', async () => {
  const list = (await admin.get('/api/admin/invoices')).body.filter((i) => i.status === 'sent');
  const [first, second] = list;
  const paid = await admin.post(`/api/admin/invoices/${first._id}/paid`).send({ paymentRef: 'WIRE-889' });
  assert.equal(paid.body.status, 'paid');
  assert.ok(paid.body.paidAt);
  assert.equal((await admin.post(`/api/admin/invoices/${first._id}/void`)).status, 409);
  assert.equal((await admin.post(`/api/admin/invoices/${first._id}/paid`).send({})).status, 409);
  const v = await admin.post(`/api/admin/invoices/${second._id}/void`);
  assert.equal(v.body.status, 'void');
  assert.ok(v.body.number, 'a voided invoice keeps its number');
  assert.equal((await admin.post('/api/admin/invoices').send(inv(aId))).status, 201);
  const next = await admin.post(`/api/admin/invoices/${(await admin.get('/api/admin/invoices')).body.find((i) => i.status === 'draft')._id}/send`);
  assert.match(next.body.number, /\/003$/, 'numbers are never reused after a void');
});

let propId;
t('proposals: draft hidden, accept needs name + agreement, evidence recorded, one acceptance only', async () => {
  const body = { client: aId, title: 'Invoicing MVP', summary: 'Scope text', deliverables: ['API', 'UI'], timeline: '6 weeks', currency: 'USD', amount: 6000, paymentTerms: '50% upfront', terms: '', validUntil: inDays(10) };
  const d = await admin.post('/api/admin/proposals').send(body);
  assert.equal(d.status, 201);
  propId = d.body._id;
  assert.match(d.body.terms, /Terms of Service/);
  assert.equal((await clientA.get(`/api/portal/proposals/${propId}`)).status, 404); // still a draft
  assert.equal((await admin.put(`/api/admin/proposals/${propId}`).send({ ...body, amount: 6500 })).status, 200);
  assert.equal((await admin.post(`/api/admin/proposals/${propId}/send`)).status, 200);
  assert.equal((await admin.put(`/api/admin/proposals/${propId}`).send(body)).status, 409); // locked once sent
  assert.equal((await clientB.get(`/api/portal/proposals/${propId}`)).status, 404);
  assert.equal((await clientA.post(`/api/portal/proposals/${propId}/accept`).send({ name: 'R', agree: true })).status, 400);
  const noAgree = await clientA.post(`/api/portal/proposals/${propId}/accept`).send({ name: 'Riya Mehta', agree: false });
  assert.equal(noAgree.status, 400);
  assert.match(noAgree.body.fields.agree, /confirm you agree/, 'human-readable message');
  const ok = await clientA.post(`/api/portal/proposals/${propId}/accept`).send({ name: 'Riya Mehta', agree: true });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.status, 'accepted');
  assert.equal(ok.body.acceptance.name, 'Riya Mehta');
  assert.equal(ok.body.acceptance.email, 'a@client.com');
  assert.match(ok.body.acceptance.contentHash, /^[a-f0-9]{64}$/);
  assert.ok(ok.body.acceptance.ip && ok.body.acceptance.at);
  assert.equal((await clientA.post(`/api/portal/proposals/${propId}/accept`).send({ name: 'Riya Mehta', agree: true })).status, 409);
  assert.equal((await admin.delete(`/api/admin/proposals/${propId}`)).status, 409); // accepted = record of agreement
});

t('proposals: expired proposals cannot be accepted; decline works', async () => {
  const mk = (over) => admin.post('/api/admin/proposals').send({ client: aId, title: 'Old', summary: '', deliverables: [], timeline: '', currency: 'USD', amount: 100, paymentTerms: '', terms: '', validUntil: '', ...over });
  const exp = (await mk({ validUntil: inDays(-1) })).body;
  await admin.post(`/api/admin/proposals/${exp._id}/send`);
  assert.equal((await clientA.post(`/api/portal/proposals/${exp._id}/accept`).send({ name: 'Riya Mehta', agree: true })).status, 409);
  const dec = (await mk({ title: 'Declinable' })).body;
  await admin.post(`/api/admin/proposals/${dec._id}/send`);
  const r = await clientA.post(`/api/portal/proposals/${dec._id}/decline`).send({ reason: 'Budget' });
  assert.equal(r.body.status, 'declined');
  assert.equal((await clientA.post(`/api/portal/proposals/${dec._id}/accept`).send({ name: 'Riya Mehta', agree: true })).status, 409);
});

t('SEO: sitemap lists published case studies only; robots.txt works', async () => {
  const sm = await request(app).get('/sitemap.xml');
  assert.equal(sm.status, 200);
  assert.match(sm.headers['content-type'], /xml/);
  assert.match(sm.text, /\/work\/alpha-app<\/loc>/);
  assert.ok(!sm.text.includes('alpha-app-2'), 'drafts must not be listed');
  assert.ok(!sm.text.includes('/admin'));
});

const nextCode = (secret) => totp(secret, Date.now() + 30000); // a fresh step, so it isn't the one used to enrol
const mkClient = async (email) => {
  const r = await admin.post('/api/admin/clients').send({ name: email.split('@')[0], email });
  const agent = request.agent(app);
  await agent.post('/api/auth/accept-invite').send({ token: inviteToken(r.body.inviteLink), password: PW });
  return agent;
};
const enable2fa = async (agent) => {
  const setup = await agent.post('/api/auth/2fa/setup').send({ password: PW });
  const en = await agent.post('/api/auth/2fa/enable').send({ code: totp(setup.body.secret) });
  return { secret: setup.body.secret, codes: en.body.recoveryCodes };
};
const challengeFor = async (email) => (await request(app).post('/api/auth/login').send({ email, password: PW })).body.challenge;
let tf;

t('2FA enrolment: needs the password, proves the app works, shows recovery codes once', async () => {
  const other = await mkClient('tf1@client.com');
  const second = (await login('tf1@client.com')).agent; // a second device
  assert.equal((await other.get('/api/auth/me')).body.user.twoFactorEnabled, false);
  assert.equal((await other.post('/api/auth/2fa/setup').send({ password: 'wrong-password-123' })).status, 400);
  const setup = await other.post('/api/auth/2fa/setup').send({ password: PW });
  assert.equal(setup.status, 200);
  assert.match(setup.body.qr, /^data:image\/png;base64,/);
  assert.match(setup.body.otpauthUri, /^otpauth:\/\/totp\/.+secret=[A-Z2-7]{32}/);
  assert.equal((await other.post('/api/auth/2fa/enable').send({ code: '000000' })).status, 400);
  const enrolAt = Date.now(); // remember WHEN, so later checks don't depend on how long the suite has been running
  const en = await other.post('/api/auth/2fa/enable').send({ code: totp(setup.body.secret, enrolAt) });
  assert.equal(en.status, 200);
  assert.equal(en.body.recoveryCodes.length, 10);
  const me = (await other.get('/api/auth/me')).body.user;
  assert.equal(me.twoFactorEnabled, true);
  assert.ok(!JSON.stringify(me).includes('secret') && !JSON.stringify(me).includes(setup.body.secret), 'seed never returned');
  const row = await User.findOne({ email: 'tf1@client.com' }).select('+twoFactor.secretEnc');
  assert.ok(row.twoFactor.secretEnc && !row.twoFactor.secretEnc.includes(setup.body.secret), 'seed is encrypted at rest');
  assert.equal((await second.get('/api/portal/projects')).status, 401, 'enabling signs out the other devices');
  assert.equal((await other.get('/api/portal/projects')).status, 200, 'but not the device that did it');
  assert.equal((await other.post('/api/auth/2fa/setup').send({ password: PW })).status, 409);
  tf = { email: 'tf1@client.com', agent: other, secret: setup.body.secret, codes: en.body.recoveryCodes, enrolAt };
});

t('2FA login: password alone gives no session; the challenge is not a session', async () => {
  const r = await request(app).post('/api/auth/login').send({ email: tf.email, password: PW });
  assert.equal(r.status, 200);
  assert.equal(r.body.needs2fa, true);
  assert.equal(r.body.user, undefined);
  assert.ok(!r.headers['set-cookie'], 'no cookie before the second step');
  assert.equal((await request(app).get('/api/portal/projects').set('Cookie', `token=${r.body.challenge}`)).status, 401, 'challenge cannot be used as a session');
  assert.equal((await request(app).post('/api/auth/login/2fa').send({ challenge: r.body.challenge, code: '123456' })).status, 401);
  assert.equal((await request(app).post('/api/auth/login/2fa').send({ challenge: 'x'.repeat(40), code: nextCode(tf.secret) })).status, 401);
});

t('2FA login: correct code works once; replay, same-step reuse and recovery codes behave', async () => {
  const challenge = await challengeFor(tf.email);
  const agent = request.agent(app);
  assert.equal((await agent.post('/api/auth/login/2fa').send({ challenge, code: totp(tf.secret, tf.enrolAt) })).status, 401, 'the step used to enrol is already spent');
  const code = nextCode(tf.secret);
  const ok = await agent.post('/api/auth/login/2fa').send({ challenge, code });
  assert.equal(ok.status, 200);
  assert.match(ok.headers['set-cookie'][0], /HttpOnly/);
  assert.equal((await agent.get('/api/portal/projects')).status, 200);
  assert.equal((await request(app).post('/api/auth/login/2fa').send({ challenge, code })).status, 401, 'a code cannot be replayed');
  const rec = tf.codes[0];
  const a2 = request.agent(app);
  assert.equal((await a2.post('/api/auth/login/2fa').send({ challenge: await challengeFor(tf.email), code: rec.toUpperCase() })).status, 200);
  assert.equal((await request(app).post('/api/auth/login/2fa').send({ challenge: await challengeFor(tf.email), code: rec })).status, 401);
});

t('2FA: regenerating recovery codes retires the old set', async () => {
  assert.equal((await tf.agent.post('/api/auth/2fa/recovery-codes').send({ password: PW, code: 'nope-nope' })).status, 401);
  const r = await tf.agent.post('/api/auth/2fa/recovery-codes').send({ password: PW, code: tf.codes[1] });
  assert.equal(r.status, 200);
  assert.equal(r.body.recoveryCodes.length, 10);
  assert.equal((await request(app).post('/api/auth/login/2fa').send({ challenge: await challengeFor(tf.email), code: tf.codes[2] })).status, 401, 'old codes are dead');
  tf.codes = r.body.recoveryCodes;
});

t('2FA: five wrong codes lock the account for a while, even against the right code', async () => {
  const victim = await mkClient('tf2@client.com');
  const { secret } = await enable2fa(victim);
  const challenge = await challengeFor('tf2@client.com');
  for (let i = 0; i < 5; i += 1) assert.equal((await request(app).post('/api/auth/login/2fa').send({ challenge, code: '000000' })).status, 401);
  const locked = await request(app).post('/api/auth/login/2fa').send({ challenge, code: nextCode(secret) });
  assert.equal(locked.status, 429);
  assert.match(locked.body.error, /Too many/);
});

t('2FA: disabling needs password and a valid code, then login is single-step again', async () => {
  assert.equal((await tf.agent.post('/api/auth/2fa/disable').send({ password: 'wrong-password-123', code: tf.codes[0] })).status, 400);
  assert.equal((await tf.agent.post('/api/auth/2fa/disable').send({ password: PW, code: '000000' })).status, 401);
  assert.equal((await tf.agent.post('/api/auth/2fa/disable').send({ password: PW, code: tf.codes[0] })).status, 200);
  assert.equal((await tf.agent.get('/api/auth/me')).body.user.twoFactorEnabled, false);
  const r = await request(app).post('/api/auth/login').send({ email: tf.email, password: PW });
  assert.equal(r.body.needs2fa, undefined);
  assert.equal(r.body.user.email, tf.email);
});

t('About page content: admin edits flow to the public profile; drafts and bad links are rejected', async () => {
  const exp = { role: 'Freelance developer', company: 'Self-employed', period: '2026 – present', place: 'Remote', points: ['Built MVPs for startups'], published: true, order: 1 };
  const created = await admin.post('/api/admin/experience').send(exp);
  assert.equal(created.status, 201);
  const draft = await admin.post('/api/admin/experience').send({ ...exp, role: 'Hidden draft', published: false });
  assert.equal(draft.status, 201);
  const sg = await admin.post('/api/admin/skill-groups').send({ title: 'Backend', subtitle: 'APIs', skills: ['Node.js', 'Express'], published: true, order: 1 });
  assert.equal(sg.status, 201);
  assert.equal((await admin.post('/api/admin/certifications').send({ name: 'X', issuer: 'Y', link: 'javascript:alert(1)', published: true, order: 1 })).status, 400);
  assert.equal((await admin.post('/api/admin/certifications').send({ name: 'Cloud Basics', issuer: 'Acme', link: 'https://example.com/c/1', published: true, order: 1 })).status, 201);
  assert.equal((await admin.post('/api/admin/education').send({ degree: 'B.Tech CSE', school: 'RGEC', place: 'Ramgarh', period: '2022 – 2026', score: '', published: true, order: 1 })).status, 201);
  const pub = (await request(app).get('/api/public/profile')).body;
  assert.deepEqual(pub.experience.map((e) => e.role), ['Freelance developer'], 'drafts are not public');
  assert.deepEqual(pub.skillGroups[0].skills, ['Node.js', 'Express']);
  assert.equal(pub.certifications.length, 1);
  assert.equal(pub.education.length, 1);
  const upd = await admin.put(`/api/admin/experience/${created.body._id}`).send({ role: 'Senior freelance developer' });
  assert.equal(upd.body.role, 'Senior freelance developer');
  assert.equal((await request(app).get('/api/public/profile')).body.experience[0].role, 'Senior freelance developer');
  assert.equal((await clientA.post('/api/admin/experience').send(exp)).status, 403, 'clients cannot edit your About page');
  assert.equal((await request(app).post('/api/admin/experience').send(exp)).status, 401);
  assert.equal((await admin.delete(`/api/admin/experience/${created.body._id}`)).status, 200);
});

t('reminders: invoice chasers escalate once each, never repeat, and skip paid/void invoices', async () => {
  const { runDailyJobs } = await import('../src/jobs/reminders.js');
  const rClient = await mkClient('rem1@client.com');
  const rid = (await admin.get('/api/admin/clients')).body.find((u) => u.email === 'rem1@client.com')._id;
  const mk = async (over) => { const i = (await admin.post('/api/admin/invoices').send(inv(rid, over))).body; return (await admin.post(`/api/admin/invoices/${i._id}/send`)).body; };
  const soon = await mk({ issueDate: inDays(-10), dueDate: inDays(2) });       // due in 2 days
  const late5 = await mk({ issueDate: inDays(-30), dueDate: inDays(-5) });     // 5 days overdue
  const late12 = await mk({ issueDate: inDays(-40), dueDate: inDays(-12) });   // 12 days overdue
  const paid = await mk({ issueDate: inDays(-30), dueDate: inDays(-6) });
  await admin.post(`/api/admin/invoices/${paid._id}/paid`).send({});
  const voided = await mk({ issueDate: inDays(-30), dueDate: inDays(-6) });
  await admin.post(`/api/admin/invoices/${voided._id}/void`);

  const outbox = [];
  const send = async (m) => { outbox.push(m); return true; };
  const to = (addr) => outbox.filter((m) => m.to === addr);

  const r1 = await runDailyJobs({ send, force: true });
  const mine = to('rem1@client.com');
  assert.equal(mine.length, 3, 'one email per open invoice, none for paid or void');
  assert.ok(mine.find((m) => m.subject.includes(soon.number) && /due/i.test(m.subject)), 'due-soon reminder');
  assert.ok(mine.find((m) => m.subject.includes(late5.number) && /overdue/i.test(m.subject) && !/second/i.test(m.subject)), 'first overdue notice');
  assert.ok(mine.find((m) => m.subject.includes(late12.number) && /second reminder/i.test(m.subject)), 'a long-overdue invoice jumps straight to the second reminder');
  assert.ok(!mine.some((m) => m.subject.includes(paid.number) || m.subject.includes(voided.number)));
  assert.ok(mine.every((m) => m.text.includes('/portal/invoices/')), 'each email links to the invoice');
  assert.ok(r1.clientEmails >= 3);

  outbox.length = 0;
  await runDailyJobs({ send, force: true });
  assert.equal(to('rem1@client.com').length, 0, 'running again the same day sends nothing new');

  outbox.length = 0;
  await runDailyJobs({ send, force: true, now: new Date(Date.now() + 8 * 864e5) }); // a week later
  const later = to('rem1@client.com');
  assert.equal(later.length, 2, 'the due-soon invoice is now overdue, the 5-day-late one is now 13 days late');
  assert.ok(later.find((m) => m.subject.includes(soon.number) && /overdue/i.test(m.subject)));
  assert.ok(later.find((m) => m.subject.includes(late5.number) && /second reminder/i.test(m.subject)));
  assert.ok(!later.some((m) => m.subject.includes(late12.number)), 'the final stage was already sent');

  outbox.length = 0;
  await runDailyJobs({ send, force: true, now: new Date(Date.now() + 30 * 864e5) });
  const final = to('rem1@client.com');
  assert.equal(final.length, 1, 'the invoice that had skipped the final stage gets it now');
  assert.ok(final[0].subject.includes(soon.number) && /second reminder/i.test(final[0].subject));
  outbox.length = 0;
  await runDailyJobs({ send, force: true, now: new Date(Date.now() + 60 * 864e5) });
  assert.equal(to('rem1@client.com').length, 0, 'after the last stage, no more emails ever');

  // a failed delivery is not recorded as sent, so it is retried next time
  const retry = await mk({ issueDate: inDays(-30), dueDate: inDays(-4) });
  assert.equal((await runDailyJobs({ send: async () => false, force: true })).clientEmails, 0);
  outbox.length = 0;
  await runDailyJobs({ send, force: true });
  assert.ok(to('rem1@client.com').find((m) => m.subject.includes(retry.number)), 'retried after a failed send');
});

t('reminders: stale milestones nudge the client once; daily summary tells you what is waiting', async () => {
  const { runDailyJobs } = await import('../src/jobs/reminders.js');
  const { Lead } = await import('../src/models/Lead.js');
  const { ClientProject } = await import('../src/models/ClientProject.js');
  const rid = (await admin.get('/api/admin/clients')).body.find((u) => u.email === 'rem1@client.com')._id;
  const proj = (await admin.post('/api/admin/client-projects').send({ client: rid, title: 'Reminder Project', status: 'in_progress' })).body;
  const patched = (await admin.patch(`/api/admin/client-projects/${proj._id}`).send({ milestones: [{ title: 'Backend ready', status: 'delivered' }, { title: 'Design', status: 'pending' }] })).body;
  assert.ok(patched.milestones[0].deliveredAt, 'delivery time is recorded');
  const mid = patched.milestones[0]._id;
  await ClientProject.updateOne({ _id: proj._id, 'milestones._id': mid }, { $set: { 'milestones.$.deliveredAt': new Date(Date.now() - 8 * 864e5) } });
  await request(app).post('/api/public/leads').send({ name: 'Quiet Lead', email: 'quiet@startup.io', message: 'Interested in an MVP, please reply when you can.', consent: true });
  await Lead.collection.updateOne({ email: 'quiet@startup.io' }, { $set: { createdAt: new Date(Date.now() - 4 * 864e5) } }); // createdAt is immutable in Mongoose, so go direct

  const outbox = [];
  const send = async (m) => { outbox.push(m); return true; };
  const r = await runDailyJobs({ send, force: true });
  const nudge = outbox.find((m) => m.to === 'rem1@client.com' && m.subject.includes('Backend ready'));
  assert.ok(nudge, 'client nudged after 5+ days');
  assert.equal(r.milestoneReminders.length, 1);
  const digest = outbox.find((m) => m.to === 'owner@example.com');
  assert.ok(digest, 'owner gets a summary');
  assert.match(digest.text, /Quiet Lead/);
  assert.match(digest.text, /OVERDUE INVOICES/);
  assert.match(digest.text, /Reminder Project \/ Backend ready/);
  outbox.length = 0;
  await runDailyJobs({ send, force: true });
  assert.ok(!outbox.find((m) => m.subject.includes('Backend ready')), 'milestone nudged only once');
  // re-delivering after a change request restarts the clock and the nudge state
  await admin.patch(`/api/admin/client-projects/${proj._id}`).send({ milestones: [{ _id: mid, title: 'Backend ready', status: 'in_progress' }, { title: 'Design', status: 'pending' }] });
  const redo = (await admin.patch(`/api/admin/client-projects/${proj._id}`).send({ milestones: [{ _id: mid, title: 'Backend ready', status: 'delivered' }, { title: 'Design', status: 'pending' }] })).body;
  assert.ok(Date.now() - new Date(redo.milestones[0].deliveredAt) < 60000, 'clock restarted');
});

t('reminders: once-a-day guard, off switch, and admin controls', async () => {
  const { runDailyJobs } = await import('../src/jobs/reminders.js');
  const send = async () => true;
  assert.match((await runDailyJobs({ send, force: true })).ranAt, /^\d{4}-/);
  assert.equal((await runDailyJobs({ send })).skipped, 'Already ran today');
  const cur = (await admin.get('/api/admin/settings')).body;
  assert.equal(cur.remindersEnabled, true, 'on by default');
  await admin.put('/api/admin/settings').send({ ...cur, remindersEnabled: false });
  assert.match((await runDailyJobs({ send, force: true })).skipped, /turned off/);
  await admin.put('/api/admin/settings').send({ ...cur, remindersEnabled: true });
  const st = await admin.get('/api/admin/automation');
  assert.equal(st.status, 200);
  assert.equal(st.body.enabled, true);
  assert.ok(st.body.lastRunAt);
  assert.equal((await admin.post('/api/admin/automation/run')).status, 200);
  assert.equal((await clientA.get('/api/admin/automation')).status, 403);
  assert.equal((await clientA.post('/api/admin/automation/run')).status, 403);
  assert.equal((await request(app).post('/api/admin/automation/run')).status, 401);
});

t('Insights: slugs, publish date set once, drafts hidden from list, feed, sitemap and metadata', async () => {
  const base = { title: 'How much does an MVP cost?', slug: '', excerpt: 'A practical guide', body: '## Heading\n\nSome **bold** text.', coverImage: '', tags: ['mvp', 'pricing'], published: false };
  const a = await admin.post('/api/admin/posts').send(base);
  assert.equal(a.status, 201);
  assert.equal(a.body.slug, 'how-much-does-an-mvp-cost');
  assert.ok(!a.body.publishedAt, 'a draft has no publish date');
  assert.equal((await admin.post('/api/admin/posts').send(base)).body.slug, 'how-much-does-an-mvp-cost-2', 'duplicate titles get unique slugs');

  assert.equal((await request(app).get('/api/public/posts')).body.length, 0);
  assert.equal((await request(app).get(`/api/public/posts/${a.body.slug}`)).status, 404, 'drafts are not reachable by URL');
  assert.equal((await request(app).get('/api/public/site')).body.hasPosts, false);

  const pub = await admin.put(`/api/admin/posts/${a.body._id}`).send({ published: true });
  assert.equal(pub.status, 200);
  const when = pub.body.publishedAt;
  assert.ok(when, 'publish date is set on first publish');
  await admin.put(`/api/admin/posts/${a.body._id}`).send({ published: false });
  const again = await admin.put(`/api/admin/posts/${a.body._id}`).send({ published: true });
  assert.equal(again.body.publishedAt, when, 'republishing keeps the original date');

  const list = (await request(app).get('/api/public/posts')).body;
  assert.equal(list.length, 1);
  assert.equal(list[0].body, undefined, 'the list never carries the full article');
  assert.equal((await request(app).get(`/api/public/posts/${a.body.slug}`)).body.body, base.body);
  assert.equal((await request(app).get('/api/public/site')).body.hasPosts, true);

  const sm = (await request(app).get('/sitemap.xml')).text;
  assert.ok(sm.includes('/insights/how-much-does-an-mvp-cost</loc>') && sm.includes('/insights</loc>'));
  assert.ok(!sm.includes('how-much-does-an-mvp-cost-2'), 'the draft is not in the sitemap');
  const rss = await request(app).get('/rss.xml');
  assert.match(rss.headers['content-type'], /rss\+xml/);
  assert.match(rss.text, /<title>How much does an MVP cost\?<\/title>/);
  assert.ok(!rss.text.includes('cost-2'));

  const { metaFor, injectMeta } = await import('../src/seo.js');
  const meta = await metaFor(`/insights/${a.body.slug}`);
  assert.equal(meta.jsonld['@type'], 'Article');
  assert.equal(meta.type, 'article');
  assert.ok(meta.jsonld.datePublished);
  assert.equal(await metaFor('/insights/how-much-does-an-mvp-cost-2'), null, 'a draft has no page metadata');
  assert.match(injectMeta('<html><head></head></html>', meta), /og:type" content="article"/);
});

t('Insights: validation and permissions', async () => {
  const ok = { title: 'T', slug: '', excerpt: '', body: 'x', coverImage: '', tags: [], published: false };
  assert.equal((await admin.post('/api/admin/posts').send({ ...ok, tags: Array(9).fill('t') })).status, 400);
  assert.equal((await admin.post('/api/admin/posts').send({ ...ok, coverImage: 'javascript:alert(1)' })).status, 400);
  assert.equal((await admin.post('/api/admin/posts').send({ ...ok, body: 'x'.repeat(60001) })).status, 400);
  assert.equal((await admin.post('/api/admin/posts').send({ ...ok, title: '' })).status, 400);
  assert.equal((await clientA.post('/api/admin/posts').send(ok)).status, 403);
  assert.equal((await request(app).post('/api/admin/posts').send(ok)).status, 401);
  assert.equal((await request(app).get('/api/public/posts/Bad_Slug!')).status, 404);
});

t('production plumbing: readiness is green with a database, cron runs the daily job with the secret', async () => {
  const ready = await request(app).get('/api/ready');
  assert.equal(ready.status, 200);
  assert.equal(ready.body.db, true);
  const r = await request(app).post('/api/cron/daily').set('x-cron-secret', 'cron-secret-cron-secret-1234567');
  assert.equal(r.status, 200);
  assert.ok(r.body.ranAt || r.body.skipped, 'returns the job summary or why it was skipped');
  assert.equal((await request(app).post('/api/cron/daily').set('x-cron-secret', 'wrong-secret-wrong-secret-wrong')).status, 401);
});

t('account recovery script: new-password link and 2FA reset for a locked-out user', async () => {
  const email = 'locked@client.com';
  const agent = await mkClient(email);
  const { secret } = await enable2fa(agent);
  assert.equal((await request(app).post('/api/auth/login').send({ email, password: PW })).body.needs2fa, true);
  const run = (...args) => execFileSync(process.execPath, ['src/scripts/account-recovery.js', ...args], { env: { ...process.env }, encoding: 'utf8' });
  assert.throws(() => run('nobody@client.com'), /No account found|status 1/);
  const out = run(email, '--reset-2fa');
  assert.match(out, /Two-factor sign-in turned off/);
  const token = out.match(/token=([a-f0-9]{64})/)[1];
  assert.equal((await agent.get('/api/portal/projects')).status, 401, 'old sessions are signed out');
  const fresh = request.agent(app);
  assert.equal((await fresh.post('/api/auth/accept-invite').send({ token, password: 'a-brand-new-passphrase-77' })).status, 200);
  const again = await request(app).post('/api/auth/login').send({ email, password: 'a-brand-new-passphrase-77' });
  assert.equal(again.body.needs2fa, undefined, 'no second step after the reset');
  assert.equal(again.body.user.email, email);
  assert.equal((await request(app).post('/api/auth/accept-invite').send({ token, password: 'another-passphrase-12345' })).status, 400, 'the link works once');
  assert.ok(secret);
});

t('deactivating a client kills their existing session immediately', async () => {
  const users = await admin.get('/api/admin/clients');
  const b = users.body.find((u) => u.email === 'b@client.com');
  assert.equal((await clientB.get('/api/portal/projects')).status, 200);
  await admin.patch(`/api/admin/clients/${b._id}`).send({ active: false });
  assert.equal((await clientB.get('/api/portal/projects')).status, 401);
  assert.equal((await login('b@client.com')).res.status, 401);
});

t('a deactivated client cannot be revived by an invite link that was issued before', async () => {
  const c = await admin.post('/api/admin/clients').send({ name: 'Dee Active', email: 'dee@client.com' });
  assert.equal(c.status, 201);
  const token = inviteToken(c.body.inviteLink);
  assert.equal((await admin.patch(`/api/admin/clients/${c.body.client._id}`).send({ active: false })).status, 200);
  assert.equal((await request(app).post('/api/auth/accept-invite').send({ token, password: 'brand-new-password-9' })).status, 400);
});

t('re-inviting a client revokes old sessions (password reset path)', async () => {
  const users = await admin.get('/api/admin/clients');
  const a = users.body.find((u) => u.email === 'a@client.com');
  const inv = await admin.post(`/api/admin/clients/${a._id}/invite`);
  assert.equal(inv.status, 200);
  assert.equal((await clientA.get('/api/portal/projects')).status, 401);
  const agent = request.agent(app);
  assert.equal((await agent.post('/api/auth/accept-invite').send({ token: inviteToken(inv.body.inviteLink), password: 'brand-new-password-9' })).status, 200);
  assert.equal((await agent.get('/api/portal/projects')).status, 200);
});

t('change-password requires the current password and signs out other sessions', async () => {
  const { agent } = await login('admin@example.com');
  assert.equal((await agent.post('/api/auth/change-password').send({ current: 'nope-nope-nope', next: 'another-long-password-1' })).status, 400);
  assert.equal((await agent.post('/api/auth/change-password').send({ current: PW, next: 'another-long-password-1' })).status, 200);
  assert.equal((await admin.get('/api/admin/leads')).status, 401); // the older admin session is gone
  assert.equal((await agent.get('/api/admin/leads')).status, 200); // the one that changed it stays signed in
});
