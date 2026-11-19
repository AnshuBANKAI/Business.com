// Usage: npm run seed
// Creates the admin account and fills EMPTY collections with starter content from your portfolio.
// Safe to re-run: it never overwrites data you've already edited in the admin panel.
import fs from 'node:fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Post, Service, Faq, Setting, SkillGroup, Experience, Education, Certification } from '../models/Content.js';

// Single source of truth shared with the front-end offline fallback: /shared/site-content.json
const content = JSON.parse(fs.readFileSync(new URL('../../../shared/site-content.json', import.meta.url), 'utf8'));

await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

/* ── admin account ── */
if (config.ADMIN_EMAIL && config.ADMIN_PASSWORD) {
  if (config.ADMIN_PASSWORD.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }
  const email = config.ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin ${email} already exists (password unchanged).`);
  } else {
    await User.create({ name: 'Anshu Sharma', email, role: 'admin', passwordHash: await bcrypt.hash(config.ADMIN_PASSWORD, 12) });
    console.log(`Created admin account: ${email}`);
  }
} else {
  console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin creation.');
}

/* ── site settings ── */
if (!(await Setting.exists({ key: 'site' }))) {
  await Setting.create({ key: 'site', ...content.settings });
  console.log('Seeded site settings');
}

/* ── services ── */
if ((await Service.countDocuments()) === 0) {
  await Service.insertMany(content.services);
  console.log('Seeded services (edit the wording and pricing in the admin panel)');
}

/* ── FAQs ── */
if ((await Faq.countDocuments()) === 0) {
  await Faq.insertMany(content.faqs);
  console.log('Seeded FAQs (review the answers so they match how you actually work)');
}

/* ── About page: skills, experience, education, certifications ── */
for (const [Model, key, label] of [[SkillGroup, 'skillGroups', 'skill groups'], [Experience, 'experience', 'experience entries'], [Education, 'education', 'education entries'], [Certification, 'certifications', 'certifications']]) {
  if ((await Model.countDocuments()) === 0 && content[key]?.length) {
    await Model.insertMany(content[key]);
    console.log(`Seeded ${content[key].length} ${label}`);
  }
}

/* ── Insights: one DRAFT to edit (nothing is published until you decide) ── */
if ((await Post.countDocuments()) === 0 && content.posts?.length) {
  await Post.insertMany(content.posts);
  console.log(`Seeded ${content.posts.length} draft post(s) (unpublished — review and publish from Admin > Insights)`);
}

/* ── case studies (from your existing portfolio data) ── */
if ((await Project.countDocuments()) === 0) {
  await Project.insertMany(content.projects);
  console.log('Seeded 3 case studies (Hospital Bill Predictor now uses only its own ~90% accuracy figure)');
}

await mongoose.disconnect();
console.log('Seed complete.');
