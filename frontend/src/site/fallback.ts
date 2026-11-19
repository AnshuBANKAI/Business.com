import content from '../../../shared/site-content.json';
import type { CaseStudy, ServiceItem, FaqItem, SiteData, ProfileData } from '../lib/types';

/**
 * Shown if the API can't be reached, so visitors never see a blank error page.
 * Same file the seed script uses, so the two can't drift apart.
 */
export const fallbackSite: SiteData = {
  settings: { ...content.settings },
  projects: content.projects.map((p) => ({ _id: `fb-${p.slug}`, featured: false, published: true, coverImage: '', liveUrl: '', ...p })) as unknown as CaseStudy[],
  services: content.services.map((s, i) => ({ _id: `fb-s${i}`, published: true, ...s })) as unknown as ServiceItem[],
  faqs: content.faqs.map((f, i) => ({ _id: `fb-f${i}`, published: true, ...f })) as unknown as FaqItem[],
  testimonials: [],
  hasPosts: false,
};

const withIds = <T,>(rows: T[], prefix: string) => rows.map((r, i) => ({ _id: `fb-${prefix}${i}`, published: true, ...r }));
export const fallbackProfile = {
  skillGroups: withIds(content.skillGroups, 'sk'),
  experience: withIds(content.experience, 'ex'),
  education: withIds(content.education, 'ed'),
  certifications: withIds(content.certifications, 'ce'),
} as unknown as ProfileData;
