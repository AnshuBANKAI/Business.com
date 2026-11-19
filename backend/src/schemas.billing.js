import { z } from 'zod';
import { CURRENCIES, TAX_MODES } from './models/Billing.js';

const text = (max) => z.string().trim().max(max);
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const date = z.string().trim().min(1).refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');
const httpUrl = z.string().trim().max(500).refine((v) => {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Must be a valid http(s) URL');

export const invoiceSchema = z
  .object({
    client: objectId,
    project: objectId.optional().or(z.literal('')),
    issueDate: date,
    dueDate: date,
    currency: z.enum(CURRENCIES),
    taxMode: z.enum(TAX_MODES),
    gstRate: z.coerce.number().min(0).max(40).default(18),
    items: z.array(z.object({ description: text(300).min(1, 'Describe the item'), sac: text(10).optional().default(''), qty: z.coerce.number().min(0).max(100000), rate: z.coerce.number().min(0).max(1e9) })).min(1, 'Add at least one item').max(40),
    billTo: z.object({ name: text(160), company: text(160), address: text(500), country: text(80), gstin: text(20) }),
    notes: text(1000).optional().default(''),
    paymentLink: httpUrl.optional().default(''),
    paymentInstructions: text(1000).optional().default(''),
  })
  .superRefine((v, ctx) => {
    if (new Date(v.dueDate) < new Date(v.issueDate)) ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Due date can\u2019t be before the issue date' });
    if (v.taxMode.startsWith('gst_') && v.currency !== 'INR') ctx.addIssue({ code: 'custom', path: ['currency'], message: 'Domestic GST invoices are issued in INR' });
    if (v.taxMode === 'export_lut' && v.currency === 'INR') ctx.addIssue({ code: 'custom', path: ['currency'], message: 'An export invoice is normally issued in a foreign currency (payment must be received in convertible foreign exchange)' });
  });

export const paidSchema = z.object({ paidAt: date.optional(), paymentRef: text(200).optional().default('') });

export const proposalSchema = z.object({
  client: objectId,
  project: objectId.optional().or(z.literal('')),
  title: text(160).min(1),
  summary: text(6000).optional().default(''),
  deliverables: z.array(z.string().trim().min(1).max(300)).max(40).default([]),
  timeline: text(400).optional().default(''),
  currency: z.enum(CURRENCIES),
  amount: z.coerce.number().min(0).max(1e9),
  paymentTerms: text(1000).optional().default(''),
  terms: text(4000).optional().default(''),
  validUntil: date.optional().or(z.literal('')),
});

export const acceptSchema = z.object({ name: text(120).min(2, 'Type your full name to accept'), agree: z.literal(true, { error: 'Please confirm you agree to the proposal and terms' }) });
export const declineSchema = z.object({ reason: text(1000).optional().default('') });
