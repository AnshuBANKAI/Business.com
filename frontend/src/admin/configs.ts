import type { Config } from './ResourceManager';

export const CONFIGS: Record<string, Config> = {
  posts: {
    endpoint: '/api/admin/posts', title: 'Insights', singular: 'article', primary: 'title', secondary: 'excerpt',
    defaults: { published: false, tags: [] },
    fields: [
      { name: 'title', label: 'Title', type: 'text' }, { name: 'slug', label: 'URL slug', type: 'text', hint: 'Leave blank to generate from the title' },
      { name: 'excerpt', label: 'Summary (shown in lists and search results)', type: 'textarea', rows: 3 },
      { name: 'body', label: 'Article', type: 'textarea', rows: 22, hint: 'Formatting: ## Heading, - bullet, 1. numbered, **bold**, *italic*, [link](https://…), > quote, ``` code ```, --- divider. Leave a blank line between paragraphs.' },
      { name: 'tags', label: 'Tags', type: 'lines', hint: 'One per line, up to 8' }, { name: 'coverImage', label: 'Cover image', type: 'image' },
      { name: 'published', label: 'Published (visible on the site)', type: 'bool' },
    ],
  },
  projects: {
    endpoint: '/api/admin/projects', title: 'Case studies', singular: 'case study', primary: 'title', secondary: 'logline',
    defaults: { accent: '#b8351a', featured: false, published: true, order: 0, stack: [], features: [], metrics: [] },
    fields: [
      { name: 'title', label: 'Title', type: 'text' }, { name: 'slug', label: 'URL slug', type: 'text', hint: 'Leave blank to generate from the title' },
      { name: 'year', label: 'Year', type: 'text' }, { name: 'role', label: 'My role', type: 'text', hint: 'e.g. Sole full-stack developer' }, { name: 'duration', label: 'How long it took', type: 'text', hint: 'e.g. 6 weeks' }, { name: 'genre', label: 'Type / category', type: 'text', hint: 'e.g. AI • Full-stack' },
      { name: 'logline', label: 'One-line summary', type: 'textarea' }, { name: 'problem', label: 'The problem', type: 'textarea' }, { name: 'solution', label: 'What I built', type: 'textarea' },
      { name: 'stack', label: 'Tech stack', type: 'lines' }, { name: 'features', label: 'Highlights', type: 'lines' }, { name: 'metrics', label: 'Results / metrics', type: 'metrics', hint: 'Only include numbers you can back up' },
      { name: 'github', label: 'GitHub URL', type: 'text' }, { name: 'liveUrl', label: 'Live URL', type: 'text' },
      { name: 'coverImage', label: 'Cover image', type: 'image' }, { name: 'accent', label: 'Accent colour', type: 'color' },
      { name: 'featured', label: 'Featured', type: 'bool' }, { name: 'published', label: 'Published (visible on the site)', type: 'bool' }, { name: 'order', label: 'Sort order (low first)', type: 'number' },
    ],
  },
  services: {
    endpoint: '/api/admin/services', title: 'Services', singular: 'service', primary: 'title', secondary: 'summary',
    defaults: { published: true, order: 0, bullets: [] },
    fields: [
      { name: 'title', label: 'Title', type: 'text' }, { name: 'startingPrice', label: 'Price note', type: 'text', hint: 'e.g. From $1,500 or Custom quote' },
      { name: 'summary', label: 'Summary', type: 'textarea' }, { name: 'bullets', label: 'Bullet points', type: 'lines' },
      { name: 'published', label: 'Published', type: 'bool' }, { name: 'order', label: 'Sort order', type: 'number' },
    ],
  },
  testimonials: {
    endpoint: '/api/admin/testimonials', title: 'Testimonials', singular: 'testimonial', primary: 'name', secondary: 'company',
    defaults: { published: true, order: 0 },
    fields: [
      { name: 'name', label: 'Name', type: 'text' }, { name: 'role', label: 'Role', type: 'text' }, { name: 'company', label: 'Company', type: 'text' },
      { name: 'quote', label: 'Quote', type: 'textarea', hint: 'Use real quotes with the client\u2019s permission' },
      { name: 'published', label: 'Published', type: 'bool' }, { name: 'order', label: 'Sort order', type: 'number' },
    ],
  },
  faqs: {
    endpoint: '/api/admin/faqs', title: 'FAQs', singular: 'FAQ', primary: 'question', secondary: 'answer',
    defaults: { published: true, order: 0 },
    fields: [
      { name: 'question', label: 'Question', type: 'text' }, { name: 'answer', label: 'Answer', type: 'textarea' },
      { name: 'published', label: 'Published', type: 'bool' }, { name: 'order', label: 'Sort order', type: 'number' },
    ],
  },
  skillGroups: {
    endpoint: '/api/admin/skill-groups', title: 'Skills', singular: 'skill group', primary: 'title', secondary: 'subtitle',
    defaults: { published: true, order: 0, skills: [] },
    fields: [
      { name: 'title', label: 'Group name', type: 'text', hint: 'e.g. Frontend' }, { name: 'subtitle', label: 'One-line description', type: 'text' },
      { name: 'skills', label: 'Skills', type: 'lines' }, { name: 'published', label: 'Show on About page', type: 'bool' }, { name: 'order', label: 'Sort order', type: 'number' },
    ],
  },
  experience: {
    endpoint: '/api/admin/experience', title: 'Experience', singular: 'experience entry', primary: 'role', secondary: 'company',
    defaults: { published: true, order: 0, points: [] },
    fields: [
      { name: 'role', label: 'Role', type: 'text' }, { name: 'company', label: 'Company / client', type: 'text' },
      { name: 'period', label: 'Period', type: 'text', hint: 'e.g. July 2025 – Aug 2025' }, { name: 'place', label: 'Location', type: 'text', hint: 'e.g. Remote' },
      { name: 'points', label: 'What you did', type: 'lines' }, { name: 'published', label: 'Show on About page', type: 'bool' }, { name: 'order', label: 'Sort order', type: 'number' },
    ],
  },
  education: {
    endpoint: '/api/admin/education', title: 'Education', singular: 'education entry', primary: 'degree', secondary: 'school',
    defaults: { published: true, order: 0 },
    fields: [
      { name: 'degree', label: 'Degree / qualification', type: 'text' }, { name: 'school', label: 'School / college', type: 'text' },
      { name: 'place', label: 'Location', type: 'text' }, { name: 'period', label: 'Period', type: 'text' }, { name: 'score', label: 'Result', type: 'text', hint: 'e.g. CGPA 7.43 (leave blank to hide)' },
      { name: 'published', label: 'Show on About page', type: 'bool' }, { name: 'order', label: 'Sort order', type: 'number' },
    ],
  },
  certifications: {
    endpoint: '/api/admin/certifications', title: 'Certifications', singular: 'certification', primary: 'name', secondary: 'issuer',
    defaults: { published: true, order: 0 },
    fields: [
      { name: 'name', label: 'Certificate name', type: 'text' }, { name: 'issuer', label: 'Issued by', type: 'text' },
      { name: 'link', label: 'Public verification link', type: 'text', hint: 'Must be a public https link anyone can open (not a login-only page)' },
      { name: 'published', label: 'Show on About page', type: 'bool' }, { name: 'order', label: 'Sort order', type: 'number' },
    ],
  },
};
