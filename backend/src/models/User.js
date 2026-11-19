import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    company: { type: String, trim: true, maxlength: 160, default: '' },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    role: { type: String, enum: ['admin', 'client'], default: 'client' },
    passwordHash: { type: String, select: false },
    inviteTokenHash: { type: String, select: false },
    inviteExpires: { type: Date, select: false },
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date,
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secretEnc: { type: String, select: false },
      pendingSecretEnc: { type: String, select: false },
      recoveryHashes: { type: [String], select: false, default: [] },
      lastStep: { type: Number, select: false, default: -1 },
      failedCount: { type: Number, select: false, default: 0 },
      lockedUntil: { type: Date, select: false },
    },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.inviteTokenHash;
    delete ret.inviteExpires;
    delete ret.tokenVersion;
    ret.twoFactorEnabled = Boolean(ret.twoFactor?.enabled);
    delete ret.twoFactor;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
