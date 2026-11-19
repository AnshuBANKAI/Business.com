// RFC 6238 time-based one-time passwords (SHA-1, 6 digits, 30 s), compatible with Google Authenticator, Authy, 1Password, etc.
import crypto from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0;
  let val = 0;
  let out = '';
  for (const b of buf) {
    val = (val << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(val >>> (bits - 5)) & 31];
      bits -= 5;
    }
    val &= (1 << bits) - 1;
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = String(str).replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0;
  let val = 0;
  const out = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('Invalid base32');
    val = (val << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((val >>> (bits - 8)) & 255);
      bits -= 8;
    }
    val &= (1 << bits) - 1;
  }
  return Buffer.from(out);
}

export function hotp(secret, counter, digits = 6) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', secret).update(msg).digest();
  const off = h[19] & 0xf;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

export const totpStep = (ms = Date.now(), period = 30) => Math.floor(ms / 1000 / period);
export const totp = (secretBase32, ms = Date.now(), digits = 6) => hotp(base32Decode(secretBase32), totpStep(ms), digits);

/**
 * Returns the matching time step, or null. `afterStep` rejects any step already used, so a code
 * (even one shoulder-surfed or intercepted) can't be replayed. `window` tolerates ±30 s of clock drift.
 */
export function verifyTotp(secretBase32, code, { now = Date.now(), window = 1, afterStep = -1 } = {}) {
  if (!/^\d{6}$/.test(String(code))) return null;
  const secret = base32Decode(secretBase32);
  const current = totpStep(now);
  for (let d = -window; d <= window; d += 1) {
    const step = current + d;
    if (step <= afterStep) continue;
    const expected = Buffer.from(hotp(secret, step));
    const given = Buffer.from(String(code));
    if (crypto.timingSafeEqual(expected, given)) return step;
  }
  return null;
}

export const newSecret = () => base32Encode(crypto.randomBytes(20));

export const otpauthUri = ({ secret, account, issuer }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alike characters (0/o, 1/l/i)
export function newRecoveryCodes(n = 10) {
  return Array.from({ length: n }, () => {
    const pick = () => Array.from(crypto.randomBytes(5), (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('');
    return `${pick()}-${pick()}`;
  });
}
export const normaliseRecovery = (c) => String(c).toLowerCase().replace(/[^a-z0-9]/g, '');
export const hashRecovery = (c) => crypto.createHash('sha256').update(normaliseRecovery(c)).digest('hex');
