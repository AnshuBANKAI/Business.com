import { Message } from '../models/ClientProject.js';
import { privateDir, safeOriginalName, removeStored } from './files.js';
import { notFound, HttpError } from './errors.js';
import path from 'node:path';

export const listMessages = (projectId) => Message.find({ project: projectId }).sort({ createdAt: 1 }).limit(300).lean();

export const postMessage = (project, user, body) =>
  Message.create({ project: project._id, sender: user._id, senderName: user.name, senderRole: user.role, body });

export async function attachFile(project, file, uploadedBy) {
  if (!file) throw new HttpError(400, 'Choose a file to upload');
  project.files.push({
    name: safeOriginalName(file.originalname),
    storedName: file.filename,
    mime: file.mimetype,
    size: file.size,
    uploadedBy,
  });
  await project.save();
  return project.files[project.files.length - 1];
}

export function sendFile(res, project, fileId) {
  const f = project.files.id(fileId);
  if (!f || !/^[a-f0-9]{32}\.[a-z0-9]+$/.test(f.storedName)) throw notFound('File');
  res.download(path.join(privateDir, f.storedName), f.name);
}

export async function deleteFile(project, fileId) {
  const f = project.files.id(fileId);
  if (!f) throw notFound('File');
  const stored = f.storedName;
  f.deleteOne();
  await project.save();
  removeStored(privateDir, stored);
}
