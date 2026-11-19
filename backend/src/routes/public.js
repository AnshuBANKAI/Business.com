import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Project } from '../models/Project.js';
import { Post, Service, Testimonial, Faq, Setting, SkillGroup, Experience, Education, Certification } from '../models/Content.js';
import { Lead } from '../models/Lead.js';
import { leadSchema } from '../schemas.js';
import { notifyOwner, sendMail } from '../utils/mailer.js';
import { ah, notFound } from '../utils/errors.js';

const router = Router();
const sort = { order: 1, createdAt: -1 };
const leadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 6, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many messages from this network. Please try again later or email me directly.' } });

export const POLICY_VERSION = '2026-11-06';

/** Only these settings are ever sent to the public. PAN, bank details, LUT and SAC stay private. */
const PUBLIC_SETTING_KEYS = ['headline', 'subheadline', 'availability', 'email', 'bookingUrl', 'linkedin', 'github', 'about', 'location', 'brandName', 'legalName', 'address', 'gstin', 'whatsapp', 'grievanceName', 'grievanceEmail', 'responseTime', 'workingHours', 'commitments'];
export const publicSettings = (doc) => Object.fromEntries(PUBLIC_SETTING_KEYS.map((k) => [k, (doc && doc[k] !== undefined ? doc[k] : SETTING_DEFAULTS[k])]));

export const SETTING_DEFAULTS = {
  headline: 'I build MVPs and AI features for early-stage startups.',
  subheadline: 'Full-stack developer (React, Node, MongoDB) with hands-on generative-AI experience. I take products from idea to a live, working release.',
  availability: 'Taking on new projects',
  email: '',
  bookingUrl: '',
  linkedin: '',
  github: '',
  about: '',
  location: '',
  brandName: 'Anshu Sharma',
  legalName: '',
  address: '',
  gstin: '',
  pan: '',
  lutNumber: '',
  sacCode: '998314',
  whatsapp: '',
  grievanceName: '',
  grievanceEmail: '',
  responseTime: '1–2 working days',
  workingHours: '',
  bankDetails: '',
  remindersEnabled: true,
  commitments: [
    'Weekly progress updates in your client portal',
    'You own the code once the final invoice is paid',
    'NDA available on request',
    'Clear scope and milestones before work starts',
  ],
};

router.get(
  '/site',
  ah(async (req, res) => {
    const [settings, projects, services, testimonials, faqs, postCount] = await Promise.all([
      Setting.findOne({ key: 'site' }).lean(),
      Project.find({ published: true }).sort(sort).lean(),
      Service.find({ published: true }).sort(sort).lean(),
      Testimonial.find({ published: true }).sort(sort).lean(),
      Faq.find({ published: true }).sort(sort).lean(),
      Post.countDocuments({ published: true }),
    ]);
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ settings: publicSettings(settings), projects, services, testimonials, faqs, hasPosts: postCount > 0 });
  }),
);

router.get(
  '/posts',
  ah(async (req, res) => {
    const posts = await Post.find({ published: true }).select('-body').sort({ publishedAt: -1 }).lean();
    res.set('Cache-Control', 'public, max-age=30');
    res.json(posts);
  }),
);

router.get(
  '/posts/:slug',
  ah(async (req, res) => {
    if (!/^[a-z0-9-]{1,80}$/.test(req.params.slug)) throw notFound('Post');
    const post = await Post.findOne({ slug: req.params.slug, published: true }).lean();
    if (!post) throw notFound('Post');
    res.set('Cache-Control', 'public, max-age=30');
    res.json(post);
  }),
);

router.get(
  '/profile',
  ah(async (req, res) => {
    const q = { published: true };
    const [skillGroups, experience, education, certifications] = await Promise.all([
      SkillGroup.find(q).sort(sort).lean(), Experience.find(q).sort(sort).lean(), Education.find(q).sort(sort).lean(), Certification.find(q).sort(sort).lean(),
    ]);
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ skillGroups, experience, education, certifications });
  }),
);

router.get(
  '/projects/:slug',
  ah(async (req, res) => {
    if (!/^[a-z0-9-]{1,80}$/.test(req.params.slug)) throw notFound('Project');
    const project = await Project.findOne({ slug: req.params.slug, published: true }).lean();
    if (!project) throw notFound('Project');
    res.set('Cache-Control', 'public, max-age=30');
    res.json(project);
  }),
);

router.post(
  '/leads',
  leadLimiter,
  ah(async (req, res) => {
    const data = leadSchema.parse(req.body);
    // Honeypot: bots fill every field. Pretend success, store nothing.
    if (data.website) return res.status(201).json({ ok: true });
    const { website, consent, ...fields } = data; // eslint-disable-line no-unused-vars
    const lead = await Lead.create({ ...fields, consentAt: new Date(), consentVersion: POLICY_VERSION });
    notifyOwner(
      `New project enquiry from ${lead.name}`,
      `${lead.name} <${lead.email}>\nCompany: ${lead.company || '-'}\nBudget: ${lead.budget || '-'}\nTimeline: ${lead.timeline || '-'}\n\n${lead.message}`,
    );
    sendMail({
      to: lead.email,
      subject: 'Thanks for getting in touch',
      text: `Hi ${lead.name},\n\nThanks for reaching out. I've received your message and will reply within 1–2 working days.\n\n— Anshu`,
    });
    res.status(201).json({ ok: true });
  }),
);

export default router;
