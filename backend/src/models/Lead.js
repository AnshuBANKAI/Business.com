import mongoose from 'mongoose';

export const LEAD_STATUSES = ['new', 'contacted', 'proposal', 'won', 'lost'];

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    company: { type: String, trim: true, maxlength: 160, default: '' },
    budget: { type: String, trim: true, maxlength: 60, default: '' },
    timeline: { type: String, trim: true, maxlength: 60, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    consentAt: Date,
    consentVersion: { type: String, default: '' },
    notes: { type: String, trim: true, maxlength: 4000, default: '' },
  },
  { timestamps: true },
);

export const Lead = mongoose.model('Lead', leadSchema);
