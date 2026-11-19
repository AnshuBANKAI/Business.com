// AES-256-GCM encryption for secrets stored in the database (e.g. 2FA seeds),
// so a leaked database dump alone isn't enough to generate someone's codes.
import crypto from 'node:crypto';
import { config } from '../config.js';

const key = () => crypto.createHash('sha256').update(`secretbox-v1:${config.DATA_ENCRYPTION_KEY || config.JWT_SECRET}`).digest();

export function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
}

export function decrypt(blob) {
  const [v, iv, tag, ct] = String(blob).split('.');
  if (v !== 'v1') throw new Error('Unknown secret format');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
}
