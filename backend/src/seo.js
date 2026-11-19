import { Project } from './models/Project.js';
import { Setting, Post } from './models/Content.js';
import { config } from './config.js';
import { publicSettings } from './routes/public.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const base = () => config.PUBLIC_URL.replace(/\/$/, '');
const clip = (s, n = 160) => (String(s || '').length > n ? `${String(s).slice(0, n - 1).trimEnd()}…` : String(s || ''));

export const PRIVATE_PREFIXES = ['/admin', '/portal', '/login', '/accept-invite'];
const STATIC_PAGES = new Set(['/', '/about', '/privacy', '/terms']);

export function robotsTxt() {
  return ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /portal', 'Disallow: /login', 'Disallow: /accept-invite', 'Disallow: /api/', '', `Sitemap: ${base()}/sitemap.xml`, ''].join('\n');
}

export async function sitemapXml() {
  const [projects, posts] = await Promise.all([Project.find({ published: true }).select('slug updatedAt').lean(), Post.find({ published: true }).select('slug updatedAt').lean()]);
  const urls = [
    ...['/', '/about', '/insights', '/series', '/privacy', '/terms'].map((p) => ({ loc: `${base()}${p === '/' ? '' : p}`, priority: p === '/' ? '1.0' : p === '/about' || p === '/insights' ? '0.8' : p === '/series' ? '0.5' : '0.3' })),
    ...posts.map((p) => ({ loc: `${base()}/insights/${p.slug}`, lastmod: new Date(p.updatedAt).toISOString().slice(0, 10), priority: '0.7' })),
    ...projects.map((p) => ({ loc: `${base()}/work/${p.slug}`, lastmod: new Date(p.updatedAt).toISOString().slice(0, 10), priority: '0.7' })),
  ];
  const body = urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** Work out the <head> data for a public URL. Returns null for paths that aren't real public pages. */
export async function metaFor(pathname) {
  const settings = publicSettings(await Setting.findOne({ key: 'site' }).lean());
  const brand = settings.brandName || 'Anshu Sharma';
  const image = `${base()}/assets/og-image.jpg`;
  const sameAs = [settings.linkedin, settings.github].filter(Boolean);
  const person = { '@type': 'Person', name: 'Anshu Sharma', jobTitle: 'Full-Stack & Generative-AI Developer', url: base(), sameAs };

  if (pathname === '/') {
    return {
      title: `${brand} — Full-Stack & AI Developer for Startups`,
      description: clip(settings.subheadline),
      canonical: base(),
      image,
      jsonld: {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'ProfessionalService', name: settings.legalName || brand, url: base(), description: settings.subheadline, image, email: settings.email || undefined, areaServed: 'Worldwide', address: settings.location ? { '@type': 'PostalAddress', addressLocality: settings.location } : undefined, sameAs, founder: person },
          person,
        ],
      },
    };
  }
  if (pathname === '/about') return { title: `About ${brand} — Skills, experience & resume`, description: clip(`${settings.about || settings.subheadline}`), canonical: `${base()}/about`, image, jsonld: { '@context': 'https://schema.org', ...person } };
  if (pathname === '/series') return { title: `${brand} — The Series (cinematic portfolio)`, description: 'An interactive, film-style tour of my projects, skills and story.', canonical: `${base()}/series`, image };
  if (pathname === '/insights') return { title: `Insights — ${brand}`, description: 'Practical notes on building MVPs, working with a freelance developer, and shipping AI features.', canonical: `${base()}/insights`, image };
  if (pathname === '/privacy') return { title: `Privacy Policy — ${brand}`, description: `How ${brand} collects and uses personal data.`, canonical: `${base()}/privacy`, image };
  if (pathname === '/terms') return { title: `Terms of Service — ${brand}`, description: `The terms on which ${brand} provides software development services.`, canonical: `${base()}/terms`, image };

  const post = pathname.match(/^\/insights\/([a-z0-9-]{1,80})$/);
  if (post) {
    const a = await Post.findOne({ slug: post[1], published: true }).lean();
    if (!a) return null;
    const cover = a.coverImage?.startsWith('/') ? `${base()}${a.coverImage}` : a.coverImage?.startsWith('https://') ? a.coverImage : image;
    return {
      title: `${a.title} | ${brand}`,
      description: clip(a.excerpt || a.body.replace(/[#*`>\-\[\]()]/g, ' ').replace(/\s+/g, ' ').trim()),
      canonical: `${base()}/insights/${a.slug}`,
      image: cover,
      type: 'article',
      jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.excerpt || undefined, image: cover, datePublished: a.publishedAt ? new Date(a.publishedAt).toISOString() : undefined, dateModified: new Date(a.updatedAt).toISOString(), author: person, publisher: person, mainEntityOfPage: `${base()}/insights/${a.slug}`, keywords: (a.tags || []).join(', ') || undefined },
    };
  }

  const m = pathname.match(/^\/work\/([a-z0-9-]{1,80})$/);
  if (m) {
    const p = await Project.findOne({ slug: m[1], published: true }).lean();
    if (!p) return null;
    return {
      title: `${p.title} — Case study | ${brand}`,
      description: clip(p.logline || p.solution),
      canonical: `${base()}/work/${p.slug}`,
      image: p.coverImage?.startsWith('/') ? `${base()}${p.coverImage}` : p.coverImage?.startsWith('https://') ? p.coverImage : image,
      jsonld: { '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, description: p.logline || p.solution, url: `${base()}/work/${p.slug}`, author: person, keywords: (p.stack || []).join(', '), dateCreated: p.year || undefined },
    };
  }
  return null;
}

const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

export function injectMeta(html, meta) {
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>/gi, '');
  const block = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${esc(meta.canonical)}" />`,
    `<meta property="og:type" content="${meta.type || 'website'}" />`,
    `<link rel="alternate" type="application/rss+xml" title="Insights" href="${esc(base())}/rss.xml" />`,
    `<meta property="og:site_name" content="${esc(meta.title.split(' — ')[0])}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(meta.canonical)}" />`,
    `<meta property="og:image" content="${esc(meta.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${esc(meta.image)}" />`,
    meta.jsonld ? `<script type="application/ld+json">${safeJson(meta.jsonld)}</script>` : '',
  ].filter(Boolean).join('\n    ');
  // Function form: a string replacement would treat "$$", "$&" or "$'" inside titles as special patterns.
  return out.replace('</head>', () => `    ${block}\n  </head>`);
}

export { STATIC_PAGES };

export async function rssXml() {
  const [posts, settings] = await Promise.all([Post.find({ published: true }).select('-body').sort({ publishedAt: -1 }).limit(30).lean(), Setting.findOne({ key: 'site' }).lean()]);
  const brand = settings?.brandName || 'Anshu Sharma';
  const items = posts.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(`${base()}/insights/${p.slug}`)}</link>
      <guid isPermaLink="true">${esc(`${base()}/insights/${p.slug}`)}</guid>
      <pubDate>${new Date(p.publishedAt || p.createdAt).toUTCString()}</pubDate>
      <description>${esc(p.excerpt)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(brand)} — Insights</title>
    <link>${esc(base())}/insights</link>
    <description>Practical notes on building MVPs, working with a freelance developer, and shipping AI features.</description>
${items}
  </channel>
</rss>
`;
}
