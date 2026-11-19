import { z } from 'zod';
import { LEAD_STATUSES } from './models/Lead.js';
import { PROJECT_STATUSES, MILESTONE_STATUSES } from './models/ClientProject.js';

const text = (max) => z.string().trim().max(max);
const list = z.array(z.string().trim().min(1).max(300)).max(40);
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

// Only http(s) links are ever stored, so a `javascript:` URL can never reach an <a href>.
const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Must be a valid http(s) URL');

const imagePath = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || /^\/uploads\/public\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(v) || /^https:\/\//.test(v), 'Invalid image');

const password = z.string().min(10, 'Use at least 10 characters').max(128);

export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(1).max(128) });
export const acceptInviteSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password });
const codeField = z.string().trim().min(6, 'Enter the 6-digit code or a recovery code').max(32);
export const twoFactorLoginSchema = z.object({ challenge: z.string().min(20).max(2000), code: codeField });
export const twoFactorSetupSchema = z.object({ password: z.string().min(1).max(128) });
export const twoFactorEnableSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your app') });
export const twoFactorConfirmSchema = z.object({ password: z.string().min(1).max(128), code: codeField });
const PHONE_RE = /^[0-9+()\-\s.]*$/;
export const profileSchema = z.object({ name: text(120).min(1), company: text(160), phone: z.string().trim().max(30).regex(PHONE_RE, 'Phone can only contain digits, spaces and + - ( )') }).partial();
export const changePasswordSchema = z.object({ current: z.string().min(1).max(128), next: password });

export const leadSchema = z.object({
  name: text(120).min(1, 'Please enter your name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  company: text(160).optional().default(''),
  budget: text(60).optional().default(''),
  timeline: text(60).optional().default(''),
  message: text(4000).min(10, 'Tell me a little more (at least 10 characters)'),
  website: z.string().max(200).optional().default(''), // honeypot — real users never fill this
  consent: z.literal(true, { error: 'Please agree to the privacy notice so I can contact you' }),
});

export const projectSchema = z.object({
  title: text(140).min(1),
  slug: z.string().trim().max(80).regex(/^[a-z0-9-]*$/, 'Lowercase letters, numbers and dashes only').optional(),
  year: text(12),
  role: text(120).default(''),
  duration: text(60).default(''),
  genre: text(140),
  logline: text(400),
  problem: text(2000),
  solution: text(2000),
  stack: list,
  features: list,
  metrics: z.array(z.object({ value: text(40), label: text(100) })).max(8),
  github: httpUrl,
  liveUrl: httpUrl,
  coverImage: imagePath,
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  featured: z.boolean(),
  published: z.boolean(),
  order: z.coerce.number().int().min(-1000).max(1000),
});

export const serviceSchema = z.object({
  title: text(120).min(1),
  summary: text(600),
  bullets: list,
  startingPrice: text(60),
  published: z.boolean(),
  order: z.coerce.number().int().min(-1000).max(1000),
});

export const testimonialSchema = z.object({
  name: text(120).min(1),
  role: text(120),
  company: text(120),
  quote: text(1200).min(1),
  published: z.boolean(),
  order: z.coerce.number().int().min(-1000).max(1000),
});

export const faqSchema = z.object({
  question: text(240).min(1),
  answer: text(2000).min(1),
  published: z.boolean(),
  order: z.coerce.number().int().min(-1000).max(1000),
});

export const settingsSchema = z.object({
  headline: text(160),
  subheadline: text(400),
  availability: text(120),
  email: z.string().trim().max(254).refine((v) => !v || z.string().email().safeParse(v).success, 'Invalid email'),
  bookingUrl: httpUrl,
  linkedin: httpUrl,
  github: httpUrl,
  about: text(3000),
  location: text(120),
  brandName: text(120),
  legalName: text(160),
  address: text(500),
  gstin: text(20),
  pan: text(15),
  lutNumber: text(60),
  sacCode: text(10),
  whatsapp: z.string().trim().regex(/^\d{0,15}$/, 'Digits only, with country code (e.g. 919876543210)'),
  grievanceName: text(120),
  grievanceEmail: z.string().trim().max(254).refine((v) => !v || z.string().email().safeParse(v).success, 'Invalid email'),
  responseTime: text(80),
  workingHours: text(120),
  bankDetails: text(1000),
  commitments: z.array(z.string().trim().min(1).max(160)).max(6),
  remindersEnabled: z.boolean().default(true),
});

export const leadUpdateSchema = z.object({ status: z.enum(LEAD_STATUSES), notes: text(4000) }).partial();

export const clientCreateSchema = z.object({
  name: text(120).min(1),
  email: z.string().trim().toLowerCase().email().max(254),
  company: text(160).optional().default(''),
  phone: z.string().trim().max(30).regex(/^[0-9+()\-\s.]*$/, 'Phone can only contain digits, spaces and + - ( )').optional().default(''),
});
export const clientUpdateSchema = z.object({ name: text(120).min(1), company: text(160), phone: z.string().trim().max(30).regex(/^[0-9+()\-\s.]*$/), active: z.boolean() }).partial();

const date = z.union([z.string().trim().min(1).refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'), z.null()]).optional();

export const milestoneSchema = z.object({
  _id: objectId.optional(),
  title: text(160).min(1),
  description: text(1000).optional().default(''),
  dueDate: date,
  status: z.enum(MILESTONE_STATUSES).default('pending'),
});

export const clientProjectCreateSchema = z.object({
  client: objectId,
  title: text(160).min(1),
  description: text(4000).optional().default(''),
  status: z.enum(PROJECT_STATUSES).default('planning'),
  startDate: date,
  dueDate: date,
});

export const clientProjectUpdateSchema = z
  .object({
    title: text(160).min(1),
    description: text(4000),
    status: z.enum(PROJECT_STATUSES),
    startDate: date,
    dueDate: date,
    milestones: z.array(milestoneSchema).max(40),
  })
  .partial();

export const messageSchema = z.object({ body: text(4000).min(1, 'Write a message first') });
export const changesSchema = z.object({ note: text(1000).min(1, 'Tell me what to change') });

const order = z.coerce.number().int().min(-1000).max(1000);
const shortList = z.array(z.string().trim().min(1).max(300)).max(40);
export const skillGroupSchema = z.object({ title: text(80).min(1), subtitle: text(120), skills: shortList, published: z.boolean(), order });
export const experienceSchema = z.object({ role: text(120).min(1), company: text(160), period: text(60), place: text(80), points: shortList, published: z.boolean(), order });
export const educationSchema = z.object({ degree: text(160).min(1), school: text(160), place: text(80), period: text(60), score: text(60), published: z.boolean(), order });
export const certificationSchema = z.object({ name: text(160).min(1), issuer: text(120), link: httpUrl, published: z.boolean(), order });

export const postSchema = z.object({
  title: text(160).min(1),
  slug: z.string().trim().max(80).regex(/^[a-z0-9-]*$/, 'Lowercase letters, numbers and dashes only').optional(),
  excerpt: text(300),
  body: z.string().max(60000),
  coverImage: imagePath,
  tags: z.array(z.string().trim().min(1).max(30)).max(8),
  published: z.boolean(),
});
