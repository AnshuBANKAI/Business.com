import mongoose from 'mongoose';

export const PROJECT_STATUSES = ['planning', 'in_progress', 'review', 'completed', 'on_hold'];
export const MILESTONE_STATUSES = ['pending', 'in_progress', 'delivered', 'approved'];

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  dueDate: Date,
  status: { type: String, enum: MILESTONE_STATUSES, default: 'pending' },
  approvedAt: Date,
  deliveredAt: Date,
  reminderSentAt: Date,
});

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    storedName: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String, enum: ['admin', 'client'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const clientProjectSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    status: { type: String, enum: PROJECT_STATUSES, default: 'planning' },
    startDate: Date,
    dueDate: Date,
    milestones: { type: [milestoneSchema], default: [] },
    files: { type: [fileSchema], default: [] },
  },
  { timestamps: true },
);

clientProjectSchema.virtual('progress').get(function progress() {
  if (!this.milestones.length) return 0;
  const done = this.milestones.filter((m) => m.status === 'approved').length;
  return Math.round((done / this.milestones.length) * 100);
});
clientProjectSchema.set('toJSON', { virtuals: true, transform: (d, r) => { delete r.__v; delete r.id; return r; } });

export const ClientProject = mongoose.model('ClientProject', clientProjectSchema);

const messageSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientProject', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['admin', 'client'], required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Message = mongoose.model('Message', messageSchema);
