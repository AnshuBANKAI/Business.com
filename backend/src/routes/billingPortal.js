import { Router } from 'express';
import { Invoice, Proposal } from '../models/Billing.js';
import { validId } from '../middleware/common.js';
import { acceptSchema, declineSchema } from '../schemas.billing.js';
import { HttpError, ah, notFound } from '../utils/errors.js';
import { notifyOwner } from '../utils/mailer.js';
import { proposalHash } from './billingAdmin.js';

/** Mounted inside the portal router, which has already required a signed-in client. */
const router = Router();

router.get('/invoices', ah(async (req, res) => res.json(await Invoice.find({ client: req.user._id, status: { $in: ['sent', 'paid', 'void'] } }).sort({ issueDate: -1 }))));
router.get('/invoices/:id', validId('id'), ah(async (req, res) => {
  const inv = await Invoice.findOne({ _id: req.params.id, client: req.user._id, status: { $in: ['sent', 'paid', 'void'] } });
  if (!inv) throw notFound('Invoice');
  res.json(inv);
}));

router.get('/proposals', ah(async (req, res) => res.json(await Proposal.find({ client: req.user._id, status: { $ne: 'draft' } }).sort({ createdAt: -1 }))));
router.get('/proposals/:id', validId('id'), ah(async (req, res) => {
  const p = await Proposal.findOne({ _id: req.params.id, client: req.user._id, status: { $ne: 'draft' } });
  if (!p) throw notFound('Proposal');
  res.json(p);
}));

router.post('/proposals/:id/accept', validId('id'), ah(async (req, res) => {
  const { name } = acceptSchema.parse(req.body);
  const p = await Proposal.findOne({ _id: req.params.id, client: req.user._id, status: { $ne: 'draft' } });
  if (!p) throw notFound('Proposal');
  if (p.status !== 'sent') throw new HttpError(409, p.status === 'accepted' ? 'This proposal has already been accepted' : 'This proposal is no longer open');
  if (p.validUntil && p.validUntil < new Date()) throw new HttpError(409, 'This proposal has expired. Ask for an updated one.');
  p.status = 'accepted';
  p.acceptance = { name, email: req.user.email, at: new Date(), ip: req.ip, userAgent: String(req.get('user-agent') || '').slice(0, 300), contentHash: proposalHash(p) };
  await p.save();
  notifyOwner(`Proposal accepted: ${p.title}`, `${name} (${req.user.email}) accepted "${p.title}" for ${p.currency} ${p.amount}.`);
  res.json(p);
}));

router.post('/proposals/:id/decline', validId('id'), ah(async (req, res) => {
  const { reason } = declineSchema.parse(req.body);
  const p = await Proposal.findOne({ _id: req.params.id, client: req.user._id, status: 'sent' });
  if (!p) throw notFound('Proposal');
  p.status = 'declined';
  p.declinedAt = new Date();
  p.declineReason = reason;
  await p.save();
  notifyOwner(`Proposal declined: ${p.title}`, `${req.user.name} declined "${p.title}".${reason ? `\n\nReason: ${reason}` : ''}`);
  res.json(p);
}));

export default router;
