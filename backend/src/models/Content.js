import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const Service = model(
  'Service',
  new Schema(
    {
      title: { type: String, required: true, trim: true, maxlength: 120 },
      summary: { type: String, trim: true, maxlength: 600, default: '' },
      bullets: { type: [String], default: [] },
      startingPrice: { type: String, trim: true, maxlength: 60, default: '' },
      published: { type: Boolean, default: true },
      order: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);

export const Testimonial = model(
  'Testimonial',
  new Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      role: { type: String, trim: true, maxlength: 120, default: '' },
      company: { type: String, trim: true, maxlength: 120, default: '' },
      quote: { type: String, required: true, trim: true, maxlength: 1200 },
      published: { type: Boolean, default: true },
      order: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);

export const Faq = model(
  'Faq',
  new Schema(
    {
      question: { type: String, required: true, trim: true, maxlength: 240 },
      answer: { type: String, required: true, trim: true, maxlength: 2000 },
      published: { type: Boolean, default: true },
      order: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);

export const Setting = model(
  'Setting',
  new Schema(
    {
      key: { type: String, required: true, unique: true },
      headline: { type: String, default: '', maxlength: 160 },
      subheadline: { type: String, default: '', maxlength: 400 },
      availability: { type: String, default: '', maxlength: 120 },
      email: { type: String, default: '', maxlength: 254 },
      bookingUrl: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      about: { type: String, default: '', maxlength: 3000 },
      location: { type: String, default: '', maxlength: 120 },
      brandName: { type: String, default: '', maxlength: 120 },
      legalName: { type: String, default: '', maxlength: 160 },
      address: { type: String, default: '', maxlength: 500 },
      gstin: { type: String, default: '', maxlength: 20 },
      pan: { type: String, default: '', maxlength: 15 },
      lutNumber: { type: String, default: '', maxlength: 60 },
      sacCode: { type: String, default: '998314', maxlength: 10 },
      whatsapp: { type: String, default: '', maxlength: 15 },
      grievanceName: { type: String, default: '', maxlength: 120 },
      grievanceEmail: { type: String, default: '', maxlength: 254 },
      responseTime: { type: String, default: '', maxlength: 80 },
      workingHours: { type: String, default: '', maxlength: 120 },
      bankDetails: { type: String, default: '', maxlength: 1000 },
      commitments: { type: [String], default: [] },
      remindersEnabled: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

const list = { type: [String], default: [] };
const base = { published: { type: Boolean, default: true }, order: { type: Number, default: 0 } };

export const SkillGroup = model('SkillGroup', new Schema({ title: { type: String, required: true, trim: true, maxlength: 80 }, subtitle: { type: String, trim: true, maxlength: 120, default: '' }, skills: list, ...base }, { timestamps: true }));

export const Experience = model('Experience', new Schema({
  role: { type: String, required: true, trim: true, maxlength: 120 }, company: { type: String, trim: true, maxlength: 160, default: '' },
  period: { type: String, trim: true, maxlength: 60, default: '' }, place: { type: String, trim: true, maxlength: 80, default: '' }, points: list, ...base,
}, { timestamps: true }));

export const Education = model('Education', new Schema({
  degree: { type: String, required: true, trim: true, maxlength: 160 }, school: { type: String, trim: true, maxlength: 160, default: '' },
  place: { type: String, trim: true, maxlength: 80, default: '' }, period: { type: String, trim: true, maxlength: 60, default: '' }, score: { type: String, trim: true, maxlength: 60, default: '' }, ...base,
}, { timestamps: true }));

export const Certification = model('Certification', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 }, issuer: { type: String, trim: true, maxlength: 120, default: '' }, link: { type: String, trim: true, maxlength: 500, default: '' }, ...base,
}, { timestamps: true }));

export const JobState = model('JobState', new Schema({ key: { type: String, unique: true, required: true }, lastRunDate: String, lastRunAt: Date, lastSummary: Schema.Types.Mixed }));

export const Post = model('Post', new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
  excerpt: { type: String, trim: true, maxlength: 300, default: '' },
  body: { type: String, default: '', maxlength: 60000 },
  coverImage: { type: String, trim: true, default: '' },
  tags: { type: [String], default: [] },
  published: { type: Boolean, default: false },
  publishedAt: Date,
}, { timestamps: true }));
