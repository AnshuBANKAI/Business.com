import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../config.js';
import { HttpError } from './errors.js';

const root = path.resolve(config.UPLOAD_DIR);
export const publicDir = path.join(root, 'public');
export const privateDir = path.join(root, 'private');
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(privateDir, { recursive: true });

const IMAGE_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const DOC_TYPES = {
  ...IMAGE_TYPES,
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
};
export const mimeForExt = {};
for (const [mime, ext] of Object.entries(DOC_TYPES)) if (!mimeForExt[ext]) mimeForExt[ext] = mime;

function makeUploader(dir, types) {
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      // Stored name is random + extension from the allow-list; the client-supplied name is never used on disk.
      filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + types[file.mimetype]),
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) =>
      types[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'File type not allowed')),
  });
}

export const imageUpload = makeUploader(publicDir, IMAGE_TYPES);
export const documentUpload = makeUploader(privateDir, DOC_TYPES);

export function safeOriginalName(name) {
  return (
    String(name || 'file')
      .replace(/[\r\n"\\/]/g, '_')
      .replace(/[^\w.\- ()]/g, '_')
      .slice(0, 120) || 'file'
  );
}

export function removeStored(dir, storedName) {
  if (!/^[a-f0-9]{32}\.[a-z0-9]+$/.test(storedName || '')) return;
  fs.promises.unlink(path.join(dir, storedName)).catch(() => {});
}
