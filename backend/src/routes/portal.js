import { Router } from 'express';
import { ClientProject } from '../models/ClientProject.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validId } from '../middleware/common.js';
import { changesSchema, messageSchema } from '../schemas.js';
import { ah, notFound, HttpError } from '../utils/errors.js';
import { notifyOwner } from '../utils/mailer.js';
import { documentUpload, privateDir, removeStored } from '../utils/files.js';
import billingPortal from './billingPortal.js';
import { listMessages, postMessage, attachFile, sendFile } from '../utils/projectOps.js';

const router = Router();
router.use(requireAuth, requireRole('client'));
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.use(billingPortal);

/** The ownership check lives in the query itself: a client can never load someone else's project. */
async function ownedProject(req) {
  const project = await ClientProject.findOne({ _id: req.params.id, client: req.user._id });
  if (!project) throw notFound('Project');
  return project;
}

router.get(
  '/projects',
  ah(async (req, res) => {
    const projects = await ClientProject.find({ client: req.user._id }).select('-files').sort({ updatedAt: -1 });
    res.json(projects);
  }),
);
router.get(
  '/projects/:id',
  validId('id'),
  ah(async (req, res) => res.json(await ownedProject(req))),
);

router.post(
  '/projects/:id/milestones/:mid/approve',
  validId('id', 'mid'),
  ah(async (req, res) => {
    const project = await ownedProject(req);
    const m = project.milestones.id(req.params.mid);
    if (!m) throw notFound('Milestone');
    if (m.status !== 'delivered') throw new HttpError(409, 'This milestone is not waiting for approval');
    m.status = 'approved';
    m.approvedAt = new Date();
    await project.save();
    notifyOwner(`Milestone approved: ${m.title}`, `${req.user.name} approved "${m.title}" on ${project.title}.`);
    res.json(project);
  }),
);

router.post(
  '/projects/:id/milestones/:mid/request-changes',
  validId('id', 'mid'),
  ah(async (req, res) => {
    const { note } = changesSchema.parse(req.body);
    const project = await ownedProject(req);
    const m = project.milestones.id(req.params.mid);
    if (!m) throw notFound('Milestone');
    if (m.status !== 'delivered') throw new HttpError(409, 'This milestone is not waiting for approval');
    m.status = 'in_progress';
    await project.save();
    await postMessage(project, req.user, `Changes requested on "${m.title}": ${note}`);
    notifyOwner(`Changes requested: ${m.title}`, `${req.user.name} requested changes on "${m.title}" (${project.title}):\n\n${note}`);
    res.json(project);
  }),
);

router.get(
  '/projects/:id/messages',
  validId('id'),
  ah(async (req, res) => {
    const project = await ownedProject(req);
    res.json(await listMessages(project._id));
  }),
);
router.post(
  '/projects/:id/messages',
  validId('id'),
  ah(async (req, res) => {
    const { body } = messageSchema.parse(req.body);
    const project = await ownedProject(req);
    const msg = await postMessage(project, req.user, body);
    notifyOwner(`New message from ${req.user.name} on ${project.title}`, body);
    res.status(201).json(msg);
  }),
);

router.post(
  '/projects/:id/files',
  validId('id'),
  // Ownership is verified before any bytes are accepted from the client.
  ah(async (req, res, next) => {
    req.project = await ownedProject(req);
    next();
  }),
  documentUpload.single('file'),
  ah(async (req, res) => {
    try {
      res.status(201).json(await attachFile(req.project, req.file, 'client'));
    } catch (err) {
      if (req.file) removeStored(privateDir, req.file.filename);
      throw err;
    }
  }),
);
router.get(
  '/projects/:id/files/:fid',
  validId('id', 'fid'),
  ah(async (req, res) => sendFile(res, await ownedProject(req), req.params.fid)),
);

export default router;
