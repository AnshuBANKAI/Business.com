import crypto from 'node:crypto';
import { Router } from 'express';
import { User } from '../models/User.js';
import { Setting } from '../models/Content.js';
import { Invoice, Proposal, Counter } from '../models/Billing.js';
import { validId } from '../middleware/common.js';
import { invoiceSchema, paidSchema, proposalSchema } from '../schemas.billing.js';
import { HttpError, ah, notFound } from '../utils/errors.js';
import { computeTotals, financialYear } from '../utils/invoice.js';
import { sendMail } from '../utils/mailer.js';
import { config } from '../config.js';
import { POLICY_VERSION } from './public.js';

const portalUrl = (path) => `${config.PUBLIC_URL.replace(/\/$/, '')}/portal/${path}`;

async function assertClient(id) {
  const c = await User.findOne({ _id: id, role: 'client' });
  if (!c) throw new HttpError(400, 'Choose an existing client');
  return c;
}

/* ───────────────────────── invoices ───────────────────────── */
export const invoiceRouter = Router();

function invoiceDoc(data) {
  const { project, ...rest } = data;
  return { ...rest, ...(project ? { project } : {}), issueDate: new Date(data.issueDate), dueDate: new Date(data.dueDate), ...computeTotals(data.items, data.taxMode, data.gstRate) };
}

invoiceRouter.get('/', ah(async (req, res) => res.json(await Invoice.find().populate('client', 'name company email').sort({ createdAt: -1 }).limit(500))));

invoiceRouter.post(
  '/',
  ah(async (req, res) => {
    const data = invoiceSchema.parse(req.body);
    await assertClient(data.client);
    if (!data.paymentInstructions) data.paymentInstructions = (await Setting.findOne({ key: 'site' }).lean())?.bankDetails || '';
    res.status(201).json(await Invoice.create(invoiceDoc(data)));
  }),
);

invoiceRouter.get('/:id', validId('id'), ah(async (req, res) => {
  const inv = await Invoice.findById(req.params.id).populate('client', 'name company email');
  if (!inv) throw notFound('Invoice');
  res.json(inv);
}));

invoiceRouter.put(
  '/:id',
  validId('id'),
  ah(async (req, res) => {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) throw notFound('Invoice');
    if (inv.status !== 'draft') throw new HttpError(409, 'A sent invoice can\u2019t be edited. Void it and issue a new one.');
    const data = invoiceSchema.parse(req.body);
    await assertClient(data.client);
    inv.set({ ...invoiceDoc(data), project: data.project || undefined });
    await inv.save();
    res.json(inv);
  }),
);

invoiceRouter.delete('/:id', validId('id'), ah(async (req, res) => {
  const inv = await Invoice.findById(req.params.id);
  if (!inv) throw notFound('Invoice');
  if (inv.status !== 'draft') throw new HttpError(409, 'Only drafts can be deleted. Void a sent invoice instead.');
  await inv.deleteOne();
  res.json({ ok: true });
}));

invoiceRouter.post(
  '/:id/send',
  validId('id'),
  ah(async (req, res) => {
    const inv = await Invoice.findById(req.params.id).populate('client', 'name email');
    if (!inv) throw notFound('Invoice');
    if (inv.status !== 'draft') throw new HttpError(409, 'This invoice has already been sent');
    const s = (await Setting.findOne({ key: 'site' }).lean()) || {};
    const legalName = s.legalName || s.brandName;
    if (!legalName || !s.address) throw new HttpError(400, 'Add your business name and address in Site settings before sending invoices');
    if (inv.taxMode.startsWith('gst_') && !s.gstin) throw new HttpError(400, 'Add your GSTIN in Site settings to issue a GST invoice');
    if (inv.taxMode === 'export_lut' && !s.lutNumber) throw new HttpError(400, 'Add your LUT number (ARN) in Site settings to issue an export invoice under LUT');
    // Sequential number per financial year, assigned atomically so two invoices can never share one.
    const fy = financialYear(inv.issueDate);
    const counter = await Counter.findOneAndUpdate({ key: `invoice:${fy}` }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    inv.number = `${fy}/${String(counter.seq).padStart(3, '0')}`;
    inv.supplier = { legalName, address: s.address, pan: s.pan || '', gstin: s.gstin || '', lutNumber: s.lutNumber || '', sacCode: s.sacCode || '998314' };
    inv.status = 'sent';
    inv.sentAt = new Date();
    await inv.save();
    sendMail({ to: inv.client?.email, subject: `Invoice ${inv.number} from ${legalName}`, text: `Hi ${inv.client?.name},\n\nInvoice ${inv.number} (${inv.currency} ${inv.total.toFixed(2)}) is ready. View, print or download it in your portal:\n${portalUrl('invoices')}\n\n— ${legalName}` });
    res.json(inv);
  }),
);

invoiceRouter.post(
  '/:id/paid',
  validId('id'),
  ah(async (req, res) => {
    const { paidAt, paymentRef } = paidSchema.parse(req.body);
    const inv = await Invoice.findById(req.params.id);
    if (!inv) throw notFound('Invoice');
    if (inv.status !== 'sent') throw new HttpError(409, 'Only a sent invoice can be marked paid');
    inv.status = 'paid';
    inv.paidAt = paidAt ? new Date(paidAt) : new Date();
    inv.paymentRef = paymentRef;
    await inv.save();
    res.json(inv);
  }),
);

invoiceRouter.post('/:id/void', validId('id'), ah(async (req, res) => {
  const inv = await Invoice.findById(req.params.id);
  if (!inv) throw notFound('Invoice');
  if (inv.status !== 'sent') throw new HttpError(409, 'Only a sent, unpaid invoice can be voided');
  inv.status = 'void'; // the number stays on record; it is never reused
  await inv.save();
  res.json(inv);
}));

/* ───────────────────────── proposals ───────────────────────── */
export const proposalRouter = Router();

export const proposalHash = (p) =>
  crypto.createHash('sha256').update(JSON.stringify([p.title, p.summary, p.deliverables, p.timeline, p.currency, p.amount, p.paymentTerms, p.terms, POLICY_VERSION])).digest('hex');

const DEFAULT_TERMS = () => `This proposal is subject to the Terms of Service at ${config.PUBLIC_URL.replace(/\/$/, '')}/terms (version ${POLICY_VERSION}). Work begins once this proposal is accepted and any advance payment stated above is received.`;

function proposalDoc(data) {
  const { project, validUntil, ...rest } = data;
  return { ...rest, ...(project ? { project } : {}), validUntil: validUntil ? new Date(validUntil) : undefined, terms: data.terms || DEFAULT_TERMS() };
}

proposalRouter.get('/', ah(async (req, res) => res.json(await Proposal.find().populate('client', 'name company email').sort({ createdAt: -1 }).limit(500))));
proposalRouter.post('/', ah(async (req, res) => {
  const data = proposalSchema.parse(req.body);
  await assertClient(data.client);
  res.status(201).json(await Proposal.create(proposalDoc(data)));
}));
proposalRouter.get('/:id', validId('id'), ah(async (req, res) => {
  const p = await Proposal.findById(req.params.id).populate('client', 'name company email');
  if (!p) throw notFound('Proposal');
  res.json(p);
}));
proposalRouter.put('/:id', validId('id'), ah(async (req, res) => {
  const p = await Proposal.findById(req.params.id);
  if (!p) throw notFound('Proposal');
  if (p.status !== 'draft') throw new HttpError(409, 'A sent proposal can\u2019t be edited, because the client may already have read it. Create a new version instead.');
  const data = proposalSchema.parse(req.body);
  await assertClient(data.client);
  p.set({ ...proposalDoc(data), project: data.project || undefined });
  await p.save();
  res.json(p);
}));
proposalRouter.delete('/:id', validId('id'), ah(async (req, res) => {
  const p = await Proposal.findById(req.params.id);
  if (!p) throw notFound('Proposal');
  if (p.status === 'accepted') throw new HttpError(409, 'An accepted proposal is a record of agreement and can\u2019t be deleted');
  await p.deleteOne();
  res.json({ ok: true });
}));
proposalRouter.post('/:id/send', validId('id'), ah(async (req, res) => {
  const p = await Proposal.findById(req.params.id).populate('client', 'name email');
  if (!p) throw notFound('Proposal');
  if (p.status !== 'draft') throw new HttpError(409, 'This proposal has already been sent');
  p.status = 'sent';
  p.sentAt = new Date();
  await p.save();
  sendMail({ to: p.client?.email, subject: `Proposal: ${p.title}`, text: `Hi ${p.client?.name},\n\nYour proposal "${p.title}" is ready to review. You can read it and accept it online here:\n${portalUrl('proposals')}\n\n— Anshu` });
  res.json(p);
}));
