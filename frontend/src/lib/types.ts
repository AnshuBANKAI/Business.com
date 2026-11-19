export type Role = 'admin' | 'client';
export type User = { _id: string; name: string; email: string; company?: string; phone?: string; role: Role; twoFactorEnabled?: boolean };

export type Metric = { value: string; label: string };
export type CaseStudy = {
  _id: string; title: string; slug: string; year: string; role: string; duration: string; genre: string; logline: string;
  problem: string; solution: string; stack: string[]; features: string[]; metrics: Metric[];
  github: string; liveUrl: string; coverImage: string; accent: string;
  featured: boolean; published: boolean; order: number;
};
export type ServiceItem = { _id: string; title: string; summary: string; bullets: string[]; startingPrice: string; published: boolean; order: number };
export type TestimonialItem = { _id: string; name: string; role: string; company: string; quote: string; published: boolean; order: number };
export type FaqItem = { _id: string; question: string; answer: string; published: boolean; order: number };
export type SiteSettings = {
  headline: string; subheadline: string; availability: string; email: string;
  bookingUrl: string; linkedin: string; github: string; about: string; location: string;
  brandName: string; legalName: string; address: string; gstin: string; whatsapp: string;
  grievanceName: string; grievanceEmail: string; responseTime: string; workingHours: string; commitments: string[];
};
/** Extra private business fields only the admin ever receives. */
export type AdminSettings = SiteSettings & { pan: string; lutNumber: string; sacCode: string; bankDetails: string; remindersEnabled: boolean };
export type Post = { _id: string; title: string; slug: string; excerpt: string; body: string; coverImage: string; tags: string[]; published: boolean; publishedAt?: string; updatedAt: string };
export type SiteData = { hasPosts?: boolean; settings: SiteSettings; projects: CaseStudy[]; services: ServiceItem[]; testimonials: TestimonialItem[]; faqs: FaqItem[] };

export const LEAD_STATUSES = ['new', 'contacted', 'proposal', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type Lead = { _id: string; name: string; email: string; company: string; budget: string; timeline: string; message: string; status: LeadStatus; notes: string; createdAt: string };

export type ClientRow = { _id: string; name: string; email: string; company: string; phone?: string; active: boolean; status: string; lastLoginAt?: string; createdAt: string };

export const PROJECT_STATUSES = ['planning', 'in_progress', 'review', 'completed', 'on_hold'] as const;
export const MILESTONE_STATUSES = ['pending', 'in_progress', 'delivered', 'approved'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];
export type Milestone = { _id?: string; title: string; description: string; dueDate?: string | null; status: MilestoneStatus; approvedAt?: string };
export type FileItem = { _id: string; name: string; size: number; uploadedBy: 'admin' | 'client'; createdAt: string };
export type ClientProject = {
  _id: string; title: string; description: string; status: ProjectStatus; progress: number;
  startDate?: string | null; dueDate?: string | null; milestones: Milestone[]; files: FileItem[];
  client: string | { _id: string; name: string; company?: string; email?: string };
  updatedAt: string;
};
export type Msg = { _id: string; senderName: string; senderRole: Role; body: string; createdAt: string };

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'] as const;
export type TaxMode = 'none' | 'export_lut' | 'gst_intra' | 'gst_inter';
export type InvoiceItem = { description: string; sac: string; qty: number; rate: number };
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';
export type PartyRef = string | { _id: string; name: string; company?: string; email?: string };
export type Invoice = {
  _id: string; number?: string; status: InvoiceStatus; client: PartyRef; issueDate: string; dueDate: string;
  currency: string; taxMode: TaxMode; gstRate: number; items: InvoiceItem[];
  billTo: { name: string; company: string; address: string; country: string; gstin: string };
  notes: string; paymentLink: string; paymentInstructions: string;
  subtotal: number; cgst: number; sgst: number; igst: number; total: number;
  supplier?: { legalName: string; address: string; pan: string; gstin: string; lutNumber: string; sacCode: string };
  sentAt?: string; paidAt?: string; paymentRef?: string;
};
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export type Proposal = {
  _id: string; client: PartyRef; title: string; summary: string; deliverables: string[]; timeline: string;
  currency: string; amount: number; paymentTerms: string; terms: string; validUntil?: string; status: ProposalStatus;
  sentAt?: string; declineReason?: string; declinedAt?: string;
  acceptance?: { name: string; email: string; at: string; ip: string; contentHash: string };
};

type Orderable = { _id: string; published: boolean; order: number };
export type SkillGroupItem = Orderable & { title: string; subtitle: string; skills: string[] };
export type ExperienceItem = Orderable & { role: string; company: string; period: string; place: string; points: string[] };
export type EducationItem = Orderable & { degree: string; school: string; place: string; period: string; score: string };
export type CertificationItem = Orderable & { name: string; issuer: string; link: string };
export type ProfileData = { skillGroups: SkillGroupItem[]; experience: ExperienceItem[]; education: EducationItem[]; certifications: CertificationItem[] };

export type Automation = {
  enabled: boolean; lastRunAt: string | null; emailConfigured: boolean; ownerConfigured: boolean;
  lastSummary: null | { clientEmails: number; digest: boolean; counts?: { quietLeads: number; quietProposals: number; overdueInvoices: number; staleApprovals: number } };
};
