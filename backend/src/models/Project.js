import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    year: { type: String, trim: true, maxlength: 12, default: '' },
    role: { type: String, trim: true, maxlength: 120, default: '' },
    duration: { type: String, trim: true, maxlength: 60, default: '' },
    genre: { type: String, trim: true, maxlength: 140, default: '' },
    logline: { type: String, trim: true, maxlength: 400, default: '' },
    problem: { type: String, trim: true, maxlength: 2000, default: '' },
    solution: { type: String, trim: true, maxlength: 2000, default: '' },
    stack: { type: [String], default: [] },
    features: { type: [String], default: [] },
    metrics: { type: [{ value: String, label: String, _id: false }], default: [] },
    github: { type: String, trim: true, default: '' },
    liveUrl: { type: String, trim: true, default: '' },
    coverImage: { type: String, trim: true, default: '' },
    accent: { type: String, trim: true, default: '#b8351a' },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Project = mongoose.model('Project', projectSchema);
