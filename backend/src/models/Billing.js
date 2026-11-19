import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'];
export const TAX_MODES = ['none', 'export_lut', 'gst_intra', 'gst_inter'];
export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'void'];
export const PROPOSAL_STATUSES = ['draft', 'sent', 'accepted', 'declined'];

/** Atomic counters (invoice numbers restart each financial year). */
export const Counter = model('Counter', new Schema({ key: { type: String, unique: true, required: true }, seq: { type: Number, default: 0 } }));

const itemSchema = new Schema(
  { description: { type: String, required: true, trim: true, maxlength: 300 }, sac: { type: String, trim: true, maxlength: 10, default: '' }, qty: { type: Number, required: true, min: 0 }, rate: { type: Number, required: true, min: 0 } },
  { _id: false },
);

export const Invoice = model(
  'Invoice',
  new Schema(
    {
      number: { type: String, unique: true, sparse: true },
      status: { type: String, enum: INVOICE_STATUSES, default: 'draft', index: true },
      client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
      project: { type: Schema.Types.ObjectId, ref: 'ClientProject' },
      issueDate: { type: Date, required: true },
      dueDate: { type: Date, required: true },
      currency: { type: String, enum: CURRENCIES, default: 'INR' },
      taxMode: { type: String, enum: TAX_MODES, default: 'none' },
      gstRate: { type: Number, default: 18, min: 0, max: 40 },
      items: { type: [itemSchema], validate: (v) => v.length > 0 },
      billTo: {
        name: { type: String, default: '', maxlength: 160 },
        company: { type: String, default: '', maxlength: 160 },
        address: { type: String, default: '', maxlength: 500 },
        country: { type: String, default: '', maxlength: 80 },
        gstin: { type: String, default: '', maxlength: 20 },
      },
      notes: { type: String, default: '', maxlength: 1000 },
      paymentLink: { type: String, default: '' },
      paymentInstructions: { type: String, default: '', maxlength: 1000 },
      subtotal: Number,
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
      total: Number,
      /** Supplier details are frozen when the invoice is sent, so later settings edits can't alter an issued invoice. */
      supplier: { legalName: String, address: String, pan: String, gstin: String, lutNumber: String, sacCode: String },
      sentAt: Date,
      paidAt: Date,
      paymentRef: { type: String, default: '', maxlength: 200 },
      /** Which automatic reminders have already been sent, so none is ever sent twice. */
      reminders: { type: [{ kind: String, at: Date, _id: false }], default: [] },
    },
    { timestamps: true },
  ),
);

export const Proposal = model(
  'Proposal',
  new Schema(
    {
      client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
      project: { type: Schema.Types.ObjectId, ref: 'ClientProject' },
      title: { type: String, required: true, trim: true, maxlength: 160 },
      summary: { type: String, default: '', maxlength: 6000 },
      deliverables: { type: [String], default: [] },
      timeline: { type: String, default: '', maxlength: 400 },
      currency: { type: String, enum: CURRENCIES, default: 'INR' },
      amount: { type: Number, required: true, min: 0 },
      paymentTerms: { type: String, default: '', maxlength: 1000 },
      terms: { type: String, default: '', maxlength: 4000 },
      validUntil: Date,
      status: { type: String, enum: PROPOSAL_STATUSES, default: 'draft', index: true },
      sentAt: Date,
      /** Evidence kept for enforceability: who accepted, when, from where, and a hash of the exact terms shown. */
      acceptance: { name: String, email: String, at: Date, ip: String, userAgent: String, contentHash: String },
      declinedAt: Date,
      declineReason: { type: String, default: '', maxlength: 1000 },
    },
    { timestamps: true },
  ),
);
