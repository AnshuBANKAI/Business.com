import crypto from 'node:crypto';
import { Router } from 'express';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Post, JobState, Service, Testimonial, Faq, Setting, SkillGroup, Experience, Education, Certification } from '../models/Content.js';
import { Lead, LEAD_STATUSES } from '../models/Lead.js';
import { ClientProject, Message } from '../models/ClientProject.js';
import { Invoice, Proposal } from '../models/Billing.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validId } from '../middleware/common.js';
import { hashToken } from './auth.js';
import { config } from '../config.js';
import * as S from '../schemas.js';
import { HttpError, ah, notFound } from '../utils/errors.js';
import { slugify } from '../utils/slug.js';
import { sendMail } from '../utils/mailer.js';
import { imageUpload, documentUpload, privateDir, removeStored } from '../utils/files.js';
import { listMessages, postMessage, attachFile, sendFile, deleteFile } from '../utils/projectOps.js';
import { SETTING_DEFAULTS } from './public.js';
import { invoiceRouter, proposalRouter } from './billingAdmin.js';
import { runDailyJobs } from '../jobs/reminders.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

/** Generic list/create/update/delete for the public-site content collections. */
function crud(Model, schema, { sort = { order: 1, createdAt: -1 }, beforeCreate, beforeUpdate } = {}) {
  const r = Router();
  r.get('/', ah(async (req, res) => res.json(await Model.find().sort(sort).lean())));
  r.post(
    '/',
    ah(async (req, res) => {
      const data = schema.parse(req.body);
      if (beforeCreate) await beforeCreate(data);
      res.status(201).json(await Model.create(data));
    }),
  );
  r.put(
    '/:id',
    validId('id'),
    ah(async (req, res) => {
      const data = schema.partial().parse(req.body);
      if (beforeUpdate) await beforeUpdate(data, req.params.id);
      const doc = await Model.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
      if (!doc) throw notFound();
      res.json(doc);
    }),
  );
  r.delete(
    '/:id',
    validId('id'),
    ah(async (req, res) => {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw notFound();
      res.json({ ok: true });
    }),
  );
  return r;
}

async function uniqueSlug(base, ignoreId, Model = Project, fallback = 'project') {
  const root = slugify(base) || fallback;
  let slug = root;
  for (let n = 2; await Model.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) }); n += 1) slug = `${root}-${n}`;
  return slug;
}

router.use(
  '/projects',
  crud(Project, S.projectSchema, {
    beforeCreate: async (d) => {
      d.slug = await uniqueSlug(d.slug || d.title);
    },
    beforeUpdate: async (d, id) => {
      if (d.slug === '') delete d.slug;
      else if (d.slug) d.slug = await uniqueSlug(d.slug, id);
    },
  }),
);
router.use(
  '/posts',
  crud(Post, S.postSchema, {
    sort: { createdAt: -1 },
    beforeCreate: async (d) => {
      d.slug = await uniqueSlug(d.slug || d.title, undefined, Post, 'post');
      if (d.published) d.publishedAt = new Date();
    },
    beforeUpdate: async (d, id) => {
      if (d.slug === '') delete d.slug;
      else if (d.slug) d.slug = await uniqueSlug(d.slug, id, Post, 'post');
      // The publish date is set the first time a post goes live and then kept, so republishing never reshuffles the blog.
      if (d.published && !(await Post.exists({ _id: id, publishedAt: { $ne: null } }))) d.publishedAt = new Date();
    },
  }),
);
router.use('/services', crud(Service, S.serviceSchema));
router.use('/testimonials', crud(Testimonial, S.testimonialSchema));
router.use('/faqs', crud(Faq, S.faqSchema));
router.use('/skill-groups', crud(SkillGroup, S.skillGroupSchema));
router.use('/experience', crud(Experience, S.experienceSchema));
router.use('/education', crud(Education, S.educationSchema));
router.use('/certifications', crud(Certification, S.certificationSchema));

router.use('/invoices', invoiceRouter);
router.use('/proposals', proposalRouter);

/* ───────── automatic reminders ───────── */
router.get('/automation', ah(async (req, res) => {
  const [state, cfg] = await Promise.all([JobState.findOne({ key: 'daily' }).lean(), Setting.findOne({ key: 'site' }).lean()]);
  res.json({ enabled: cfg?.remindersEnabled !== false, lastRunAt: state?.lastRunAt || null, lastSummary: state?.lastSummary || null, emailConfigured: Boolean(config.SMTP_HOST), ownerConfigured: Boolean(config.OWNER_EMAIL || cfg?.email) });
}));
router.post('/automation/run', ah(async (req, res) => res.json(await runDailyJobs({ force: true }))));

/* ───────── site settings ───────── */
router.get(
  '/settings',
  ah(async (req, res) => {
    const doc = await Setting.findOne({ key: 'site' }).lean();
    res.json({ ...SETTING_DEFAULTS, ...(doc || {}), _id: undefined, key: undefined });
  }),
);
router.put(
  '/settings',
  ah(async (req, res) => {
    const data = S.settingsSchema.parse(req.body);
    const doc = await Setting.findOneAndUpdate({ key: 'site' }, { $set: data }, { new: true, upsert: true, runValidators: true }).lean();
    res.json({ ...doc, _id: undefined, key: undefined });
  }),
);

/* ───────── image upload for the public site ───────── */
router.post('/upload', imageUpload.single('image'), (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose an image (PNG, JPG or WebP)');
  res.status(201).json({ url: `/uploads/public/${req.file.filename}` });
});

/* ───────── overview numbers ───────── */
router.get(
  '/stats',
  ah(async (req, res) => {
    const [newLeads, totalLeads, clients, activeProjects, awaitingApproval] = await Promise.all([
      Lead.countDocuments({ status: 'new' }),
      Lead.countDocuments(),
      User.countDocuments({ role: 'client' }),
      ClientProject.countDocuments({ status: { $in: ['planning', 'in_progress', 'review'] } }),
      ClientProject.countDocuments({ 'milestones.status': 'delivered' }),
    ]);
    const [unpaid, proposalsOpen] = await Promise.all([Invoice.countDocuments({ status: 'sent' }), Proposal.countDocuments({ status: 'sent' })]);
    res.json({ newLeads, totalLeads, clients, activeProjects, awaitingApproval, unpaidInvoices: unpaid, openProposals: proposalsOpen });
  }),
);

/* ───────── leads ───────── */
router.get(
  '/leads',
  ah(async (req, res) => {
    const filter = {};
    if (typeof req.query.status === 'string' && LEAD_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    res.json(await Lead.find(filter).sort({ createdAt: -1 }).limit(500).lean());
  }),
);
router.patch(
  '/leads/:id',
  validId('id'),
  ah(async (req, res) => {
    const data = S.leadUpdateSchema.parse(req.body);
    const lead = await Lead.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!lead) throw notFound('Lead');
    res.json(lead);
  }),
);
router.delete(
  '/leads/:id',
  validId('id'),
  ah(async (req, res) => {
    if (!(await Lead.findByIdAndDelete(req.params.id))) throw notFound('Lead');
    res.json({ ok: true });
  }),
);

/* ───────── clients (accounts) ───────── */
async function issueInvite(user) {
  const raw = crypto.randomBytes(32).toString('hex');
  user.inviteTokenHash = hashToken(raw);
  user.inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  user.tokenVersion += 1; // invalidate any existing sessions (this doubles as a password reset)
  await user.save();
  const link = `${config.PUBLIC_URL.replace(/\/$/, '')}/accept-invite?token=${raw}`;
  sendMail({
    to: user.email,
    subject: 'Your client portal access',
    text: `Hi ${user.name},\n\nYou've been given access to your project portal. Set your password here (link valid for 7 days):\n\n${link}\n\n— Anshu`,
  });
  return link;
}

router.get(
  '/clients',
  ah(async (req, res) => {
    const clients = await User.find({ role: 'client' }).select('+passwordHash +inviteExpires').sort({ createdAt: -1 }).lean();
    res.json(
      clients.map((c) => ({
        _id: c._id, name: c.name, email: c.email, company: c.company, phone: c.phone, active: c.active, lastLoginAt: c.lastLoginAt, createdAt: c.createdAt,
        status: c.passwordHash ? 'active' : c.inviteExpires && c.inviteExpires > new Date() ? 'invited' : 'invite expired',
      })),
    );
  }),
);
router.post(
  '/clients',
  ah(async (req, res) => {
    const data = S.clientCreateSchema.parse(req.body);
    if (await User.exists({ email: data.email })) throw new HttpError(409, 'An account with that email already exists');
    const user = await User.create({ ...data, role: 'client' });
    const inviteLink = await issueInvite(user);
    res.status(201).json({ client: user, inviteLink });
  }),
);
router.patch(
  '/clients/:id',
  validId('id'),
  ah(async (req, res) => {
    const data = S.clientUpdateSchema.parse(req.body);
    const user = await User.findOne({ _id: req.params.id, role: 'client' });
    if (!user) throw notFound('Client');
    Object.assign(user, data);
    if (data.active === false) {
      user.tokenVersion += 1; // sign them out immediately
      user.inviteTokenHash = undefined; // and a pending invite link must not bring them back
      user.inviteExpires = undefined;
    }
    await user.save();
    res.json(user);
  }),
);
router.post(
  '/clients/:id/invite',
  validId('id'),
  ah(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, role: 'client' }).select('+inviteTokenHash +inviteExpires');
    if (!user) throw notFound('Client');
    res.json({ inviteLink: await issueInvite(user) });
  }),
);

/* ───────── client projects ───────── */
const toDate = (v) => (v === null || v === '' ? null : v ? new Date(v) : undefined);

router.get(
  '/client-projects',
  ah(async (req, res) => {
    res.json(await ClientProject.find().populate('client', 'name company email').sort({ updatedAt: -1 }));
  }),
);
router.post(
  '/client-projects',
  ah(async (req, res) => {
    const data = S.clientProjectCreateSchema.parse(req.body);
    if (!(await User.exists({ _id: data.client, role: 'client' }))) throw new HttpError(400, 'Choose an existing client');
    const project = await ClientProject.create({ ...data, startDate: toDate(data.startDate), dueDate: toDate(data.dueDate) });
    res.status(201).json(project);
  }),
);
router.get(
  '/client-projects/:id',
  validId('id'),
  ah(async (req, res) => {
    const project = await ClientProject.findById(req.params.id).populate('client', 'name company email');
    if (!project) throw notFound('Project');
    res.json(project);
  }),
);
router.patch(
  '/client-projects/:id',
  validId('id'),
  ah(async (req, res) => {
    const data = S.clientProjectUpdateSchema.parse(req.body);
    const project = await ClientProject.findById(req.params.id).populate('client', 'name email');
    if (!project) throw notFound('Project');
    const newlyDelivered = [];

    if (data.milestones) {
      const previous = new Map(project.milestones.map((m) => [String(m._id), m]));
      project.milestones = data.milestones.map((m) => {
        const old = m._id ? previous.get(m._id) : undefined;
        const out = { title: m.title, description: m.description, dueDate: toDate(m.dueDate), status: m.status };
        if (old) out._id = old._id;
        if (m.status === 'approved') out.approvedAt = old?.approvedAt || new Date();
        if (m.status === 'delivered') {
          if (old?.status === 'delivered') {
            out.deliveredAt = old.deliveredAt || new Date(); // unchanged: keep the clock and the reminder state
            out.reminderSentAt = old.reminderSentAt;
          } else {
            out.deliveredAt = new Date(); // newly delivered: restart the approval clock
            newlyDelivered.push(m.title);
          }
        }
        return out;
      });
    }
    for (const k of ['title', 'description', 'status']) if (data[k] !== undefined) project[k] = data[k];
    for (const k of ['startDate', 'dueDate']) if (data[k] !== undefined) project[k] = toDate(data[k]);
    await project.save();

    if (newlyDelivered.length && project.client?.email) {
      sendMail({
        to: project.client.email,
        subject: `Ready for your review: ${project.title}`,
        text: `Hi ${project.client.name},\n\nThe following milestone(s) are ready for your review and approval:\n- ${newlyDelivered.join('\n- ')}\n\nSign in to your portal: ${config.PUBLIC_URL.replace(/\/$/, '')}/portal\n\n— Anshu`,
      });
    }
    res.json(project);
  }),
);
router.delete(
  '/client-projects/:id',
  validId('id'),
  ah(async (req, res) => {
    const project = await ClientProject.findByIdAndDelete(req.params.id);
    if (!project) throw notFound('Project');
    await Message.deleteMany({ project: project._id });
    for (const f of project.files) removeStored(privateDir, f.storedName);
    res.json({ ok: true });
  }),
);

router.get(
  '/client-projects/:id/messages',
  validId('id'),
  ah(async (req, res) => {
    if (!(await ClientProject.exists({ _id: req.params.id }))) throw notFound('Project');
    res.json(await listMessages(req.params.id));
  }),
);
router.post(
  '/client-projects/:id/messages',
  validId('id'),
  ah(async (req, res) => {
    const { body } = S.messageSchema.parse(req.body);
    const project = await ClientProject.findById(req.params.id).populate('client', 'name email');
    if (!project) throw notFound('Project');
    const msg = await postMessage(project, req.user, body);
    sendMail({
      to: project.client?.email,
      subject: `New message on ${project.title}`,
      text: `${req.user.name} wrote:\n\n${body}\n\nReply in your portal: ${config.PUBLIC_URL.replace(/\/$/, '')}/portal/projects/${project.id}`,
    });
    res.status(201).json(msg);
  }),
);
router.post(
  '/client-projects/:id/files',
  validId('id'),
  documentUpload.single('file'),
  ah(async (req, res) => {
    const project = await ClientProject.findById(req.params.id);
    if (!project) {
      if (req.file) removeStored(privateDir, req.file.filename);
      throw notFound('Project');
    }
    res.status(201).json(await attachFile(project, req.file, 'admin'));
  }),
);
router.get(
  '/client-projects/:id/files/:fid',
  validId('id', 'fid'),
  ah(async (req, res) => {
    const project = await ClientProject.findById(req.params.id);
    if (!project) throw notFound('Project');
    sendFile(res, project, req.params.fid);
  }),
);
router.delete(
  '/client-projects/:id/files/:fid',
  validId('id', 'fid'),
  ah(async (req, res) => {
    const project = await ClientProject.findById(req.params.id);
    if (!project) throw notFound('Project');
    await deleteFile(project, req.params.fid);
    res.json({ ok: true });
  }),
);

export default router;
