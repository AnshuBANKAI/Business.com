
export type Palette = { from: string; via: string; to: string; accent: string };

export const profile = {
  fullName: 'Anshu Sharma',
  displayName: 'Anshu Sharma',
  firstName: 'Anshu',
  seriesTag: 'THE SERIES',
  /** Fictional studio card shown at the very start of the opening sequence. */
  originalLabel: 'A SHARMA PRODUCTION',
  role: 'Full-Stack Developer',
  tagline: ['Full-Stack Developer', 'Gen AI'],
  intro:
    'B.Tech CSE student (2026) with hands-on experience in the MERN stack and generative AI. Built SevSetu — a multilingual RAG chatbot that delivers government scheme information in Bhojpuri, Hindi, and English — and Recruit_AI, a full-stack interview-prep platform that scores resume–job fit, generates questions, identifies skill gaps, and produces tailored ATS-friendly resumes.',
  location: 'Ranchi, Jharkhand India',
  email: 'sharmaanshu6572@gmail.com',
  links: {
    linkedin: 'https://www.linkedin.com/in/anshu-sharma-2205a1204',
    github: 'https://github.com/AnshuBANKAI',
  },
  resumePdf: '/assets/Anshu_Resume.pdf',
  portrait: {
    src: '/assets/portrait-720.webp',
    srcSet: '/assets/portrait-420.webp 420w, /assets/portrait-720.webp 720w, /assets/portrait-1100.webp 1100w',
    alt: 'Portrait of Anshu Sharma',
  },
  interests: ['System Design', 'Gen AI'],
};

export const education = [
  {
    school: 'Ramgarh Engineering College',
    place: 'Ramgarh, Jharkhand',
    degree: 'Bachelor of Technology — Computer Science And Engineering',
    period: 'October 2022 – June 2026',
    score: 'CGPA 7.43',
  },
  {
    school: 'KK College of Engineering and Management',
    place: 'Dhanbad',
    degree: 'Diploma',
    period: 'August 2019 - July 2022',
    score: 'Score 79%',
  },
  {
    school: 'Dav Public School',
    place: 'Bachra',
    degree: 'Matriculation',
    period: 'May 2019',
    score: 'Score 67%',
  },
];

export const experience = [
  {
    company: 'Techoctanet Services Pvt. Ltd. (OctaNet)',
    role: 'Internship',
    place: 'Remote',
    period: 'July 2025 – Aug 2025',
    points: [
      'Built a responsive full-stack web application spanning front-end and back-end components.',
      'Implemented and optimized REST API integrations between the front end and back end.',
      'Deployed and managed web applications while applying version control, debugging, and end-to-end development practices.',
    ],
  },
];

export type Metric = { value: string; label: string };

export type Project = {
  id: string;
  title: string;
  year: string;
  genre: string;
  logline: string;
  stack: string[];
  build: string[];
  features: string[];
  metrics: Metric[];
  /** Omit when the repository isn't public — the GitHub button is hidden instead of linking to a 404. */
  github?: string;
  palette: Palette;
  motif: 'shield' | 'flow' | 'tenants';
};

export const projects: Project[] = [
  {
    id:'SevSetu',
    title: 'SevSetu',
    year: '2026',
    genre: 'AI • NLP • LLM',
    logline: 'A multilingual Generative AI chatbot that translates and streams government notifications across Bhojpuri, Hindi & English.',
    stack: ['Python', 'NLP', 'LLM', 'FAST API', 'React.js'],
    build: [
      'SevaSetu solves this by allowing users to ask questions in Hindi, Bhojpuri, or English and receive clear, simple, actionable information about schemes like PM Kisan, Atal Pension Yojana, PMAY, and more.',
      'Many government notifications are published in English or formal Hindi, and people who speak regional languages like Bhojpuri, or who don’t read well, miss out on schemes and announcements meant for them.',
    ],
    features: [
      'LLM-based Q&A over Government Schemes',
      'Key-information extraction',
      'FAST API integration for 10+ document types',
      'Web, browser extension, mobile & desktop apps',
      'Real-time updates',
    ],
    metrics: [
      { value: '500+', label: 'Government Schemes Services' },
      { value: '92%', label: 'accuracy' },
      { value: '60%', label: 'less manual review time' },
      { value: '45%', label: 'faster decision turnaround' },
      { value: '8', label: 'government scheme categories' },
    ],
     github: 'https://github.com/AnshuBANKAI/SevSetu',     
    palette: { from: '#1a0c0a', via: '#5c2a1a', to: '#0a0908', accent: '#c73e1d' },
    motif: 'shield',
  },
  {
    id: 'Recurit_AI',
    title: 'Recurit_AI',
    year: '2026',
    genre: 'Full-Stack • Gemini API • Microservices',
    logline: 'A full-stack recruitment platform leveraging Gemini API for intelligent candidate matching.',
    stack: ['Node.js', 'Express', 'Gemini API', 'React', 'MongoDb','Zod'],
    build: [
      'Job seekers don’t know how well their resume fits a role, what questions to expect, or how to prepare. Generic interview advice doesn’t use their own profile or the specific job description.',
      'An AI interview prep platform. The user uploads a resume and pastes a job description, and Gemini generates a match score, technical and behavioral questions with model answers, skill gaps, and a day-wise prep plan. It can also produce a tailored, ATS-friendly resume PDF. Users log in with JWT auth and can reopen their saved reports.',
    ],
    features: [
      'Resume Uploader',
      'Strict state management (processing → success / failed)',
      '2 way binding between frontend and backend',
      'Gemini API integration for AI powered analysis',
    ],
    metrics: [
      { value: '1,000+', label: 'interview reports generated' },
      { value: '99.8%', label: 'uptime' },
      { value: '70%', label: 'less manual review time' },
      { value: '40%', label: 'REST API response' },
      { value: '3×', label: 'throughput under load' },
    ],
    github: 'https://github.com/AnshuBANKAI/Recruit_AI',
    palette: { from: '#1a1508', via: '#6b4e12', to: '#0a0908', accent: '#c9a227' },
    motif: 'flow',
  },
  {
    id: 'Hospital Bill Predictor',
    title: 'Hospital Bill Predictor',
    year: '2025',
    genre: 'Machine Learning • Data Science • Streamlit',
    logline: 'An AI-powered solution to predict hospital bills based on patient data and treatment plans.',
    stack: ['Python', 'Streamlit', 'Flask'],
    build: [
      'Trained and evaluated a Random Forest regression model predicting hospital expenses from patient data with ~90% accuracy.',
      'Shipped an interactive Streamlit interface for real-time predictions, demonstrating end-to-end machine learning deployment.',
    ],
    features: [
      'Random Forest regression model',
      'Streamlit interface for real-time predictions',
      'Data preprocessing and feature engineering',
      'Model evaluation and performance metrics',
    ],
    metrics: [
      { value: '50+', label: 'concurrent tenants' },
      { value: '200+', label: 'users' },
      { value: '0', label: 'unauthorized-access incidents' },
      { value: '45m → <2m', label: 'environment setup time' },
    ],
    github: 'https://github.com/AnshuBANKAI/Hospital-bills-',
    palette: { from: '#0a121c', via: '#1e3a6e', to: '#0a0908', accent: '#3a5f9a' },
    motif: 'tenants',
  },
];

export type Achievement = {
  id: string;
  title: string;
  org: string;
  detail: string;
  laurel: string;
  link?: string;
};

export const achievements: Achievement[] = [
  {
    id: 'Student Expert',
    title: 'Student Expert',
    org: 'Postman API Fundamentals',
    detail: 'Completed the Postman API Fundamentals course and earned the Student Expert badge.',
    laurel: 'Student Expert',
    link:'https://badges.parchment.com/public/assertions/0h0ehnBJQUmPLYJ82QYBYw',
  },
  {
    id: 'Google Study Cloud Jam',
    title: 'Tech Lead GDG on Campus',
    org: 'Google Cloud',
    detail: ' Drove Google Cloud Study Jam initiatives reaching 100+ student participants on campus.',
    laurel: 'Google Study Cloud Jam',},
  {
    id: 'GeeksForGeeks',
    title: 'Marketing Lead',
    org: 'GeeksForGeeks',
    detail: ' Led marketing campaigns and student engagement for GeeksForGeeks, enhancing brand presence on campus.',
    laurel: 'GeeksForGeeks',},
  {
    id: 'Organizer',
    title: 'Organizer',
    org: 'HackManthon',
    detail: ' Organized and led “Hackmanthon,” a 24-hour hackathon — the first of its kind at Ramgarh Engineering College.',
    laurel: 'Hackathon',
  },
  {
    id: 'Students Club Head',
    title: 'Vice President, Students Club',
    org: 'Ramgarh Engineering College',
    detail: ' Elected as Vice President of the Students Club, leading initiatives and events for the student community.',
    laurel: 'Students Club Head',},
];

export type Certification = { issuer: string; name: string; link: string };

export const certifications: Certification[] = [
  { issuer: 'Forage', name: 'Deloitte Australia - Data Analytics Job Simulation', link: 'https://forage-uploads-prod.s3.amazonaws.com/completion-certificates/9PBTqmSxAf6zZTseP/io9DzWKe3PTsiS6GG_9PBTqmSxAf6zZTseP_W68PJsr5CjcwvSCWg_1750705021902_completion_certificate.pdf' },
  { issuer: 'IBM', name: 'Data Analysis Using Python', link: 'https://www.credly.com/badges/45e394ac-edc0-4997-8544-6ec474fd197c/linked_in_profile' },
  { issuer: 'Cisco', name: 'Python Essentials 1', link: 'https://www.credly.com/badges/ad4aee3b-8bc7-4f74-8531-8a9d52114f99/linked_in_profile' },
  { issuer: 'IBM', name: 'Web Development Fundamentals', link: 'https://www.credly.com/badges/1e9a0994-ff2f-4c1c-b7f9-332a217fab2b/linked_in_profile' },
  { issuer: 'Cisco', name: 'Python Essentials 2', link: 'https://www.credly.com/badges/5ad31c3b-75dd-4c1d-9ab5-c146c161ae7e/linked_in_profile' },
  { issuer: 'GeeksForGeeks', name: 'Full stack Developer', link: 'https://lnkd.in/p/d_5JiiUy' },
  { issuer: 'CodeSoft', name: 'Data Science', link: 'https://lnkd.in/p/dYngYueA' },
  { issuer: 'ISRO', name: 'Remote Sensing Data Analytics', link: 'https://lnkd.in/p/dD7axUdG' },
  { issuer: 'Simplilearn', name: 'Data Science', link: 'https://lnkd.in/p/dsBjPM4z' },
  { issuer: 'HP LIFE', name: 'Data Science & Analysis', link: 'https://lnkd.in/p/dsDjBYuW' },
  { issuer: 'Great Learning', name: 'Artificial Intelligence Fundamentals', link: 'https://lnkd.in/p/dc69Mp5c' },
  { issuer: 'Great Learning', name: 'Introduction to Web Designing', link: 'https://lnkd.in/p/dsSKcRDw' },
  { issuer: 'Deloitte', name: 'Deloitte Australia - Cybersecurity on Forage', link: 'https://lnkd.in/p/dZqgNA-e' },
  { issuer: 'Cisco', name: 'JavaScript Essentials 1', link: 'https://lnkd.in/p/dGN2WX9v' },
 
];

export type Skill = { name: string; mono: string; note?: string };
export type SkillCategory = { id: string; title: string; subtitle: string; skills: Skill[] };

export const skillCategories: SkillCategory[] = [
  {
    id: 'languages',
    title: 'Languages',
    subtitle: 'JavaScript is the primary language',
    skills: [
      { name: 'JavaScript', mono: 'Js', note: 'Primary' },
      { name: 'Python', mono: 'Py' },
     
    ],
  },
  {
    id: 'frontend',
    title: 'Frontend',
    subtitle: 'Interfaces & the web platform',
    skills: [
      { name: 'React', mono: 'Re' },
      { name: 'HTML', mono: 'Ht' },
      { name: 'CSS', mono: 'Cs' },
      { name: 'JavaScript', mono: 'Js' },
    ],
  },
  {
    id: 'backend',
    title: 'Backend',
    subtitle: 'Server-side logic',
    skills: [
      { name: 'Node.js', mono: 'No' },
      { name: 'Express.js', mono: 'Ex' },
      {name: 'Python', mono: 'Py'},
    ],
  },
  {
    id: 'infra',
    title: 'Infra & Tools',
    subtitle: 'Shipping & architecture',
    skills: [
      { name: 'Docker', mono: 'Dk' },
      { name: 'Docker Compose', mono: 'Dc' },
      { name: 'REST APIs', mono: 'Ap' },
      { name: 'Microservices', mono: 'Ms' },
      { name: 'JWT Auth', mono: 'Jw' },
      { name: 'Git / GitHub', mono: 'Gt' },
      { name: 'Postman', mono: 'Pm' },
    ],
  },
  {
    id: 'databases',
    title: 'Databases',
    subtitle: 'Indexing • Normalization',
    skills: [
   
      { name: 'MongoDB', mono: 'Mg' },
      { name: 'MySQL', mono: 'My' },
    ],
  },
  {
    id: 'fundamentals',
    title: 'CS Fundamentals',
    subtitle: 'The foundations',
    skills: [
      { name: 'DSA', mono: 'Ds' },
      { name: 'OS', mono: 'Os' },
      { name: 'CN', mono: 'Cn' },
      { name: 'DBMS', mono: 'Db' },
      { name: 'OOPs', mono: 'Oo' },
    
      { name: 'Generative AI', mono: 'GenAi' },
    ],
  },
  {
    id: 'interests',
    title: 'Interests',
    subtitle: 'Coming soon to the series',
    skills: [
      { name: 'System Design', mono: 'Sd' },
      { name: 'Cloud Computing (AWS)', mono: 'Aw' },
      { name: 'Machine Learning', mono: 'Ml' },
    ],
  },
];

/**
 * Factual cross-references shown when a skill card is hovered/tapped:
 * where the skill appears in the projects, certifications or achievements on the resume.
 */
export const skillEvidence: Record<string, string[]> = {
  
  Python: [ 'Cisco Python Essentials 1'],
  
  React: ['Frontend '],
  HTML: ['Cisco HTML Essentials'],
  CSS: ['Cisco CSS Essentials'],
  JavaScript: ['Cisco JavaScript Essentials 1 & 2'],
  'Node.js': ['Backend'],
  'Express.js': ['Backend'],
  Docker: ['Deployment'],
  'Docker Compose': ['Deployment'],
  'REST APIs': [' API'],
  Microservices: ['System Management'],
  'JWT Auth': ['Authentication'],
  'Git / GitHub': ['GitHub Foundations'],

  MongoDB: ['MongoDB Certified Associate Developer'],
  DBMS: ['Database Foundations'],

};

export type Episode = {
  code: string;
  title: string;
  description: string;
  tags: string[];
  runtime: string;
  palette: Palette;
};

export type Season = {
  number: number;
  title: string;
  period: string;
  synopsis: string;
  episodes: Episode[];
};

const crimson: Palette = { from: '#1a0c0a', via: '#5c2a1a', to: '#0a0908', accent: '#c73e1d' }; /* shu */
const amber: Palette = { from: '#1a1508', via: '#6b4e12', to: '#0a0908', accent: '#c9a227' }; /* kin */
const ocean: Palette = { from: '#0a121c', via: '#1e3a6e', to: '#0a0908', accent: '#3a5f9a' }; /* ai indigo */
const violet: Palette = { from: '#140e18', via: '#4a2c4a', to: '#0a0908', accent: '#d48a96' }; /* sakura-muted */
const jade: Palette = { from: '#0a1510', via: '#1e4a38', to: '#0a0908', accent: '#2d6a4f' }; /* deep pine */

export const seasons: Season[] = [
  {
    number: 1,
    title: 'The Beginning',
    period: '2019',
    synopsis: 'Metriculation ',
    episodes: [
      {
        code: 'S01 E01',
        title: 'The Foundation',
        description: 'Dav Public School, Bachra — 10th grade with 67% marks.',
        tags: ['Mathematics', 'Physics', 'Chemistry'],
        runtime: 'May 2019',
        palette: amber,
      },
    ],
  },
  {
    number: 2,
    title: 'Enter: Diploma',
    period: '2019 - 2022',
    synopsis: 'Started Diploma studies.',
    episodes: [
      {
        code: 'S02 E01',
        title: 'The Junior Engineer',
        description: 'KK college of Engineering and Management - 79 %.',
        tags: ['Mathematics', 'Physics', 'Computer ', 'Mechanical'],
        runtime: 'Aug 2019 – july 2022',
        palette: violet,
      },
      {
        code: 'S02 E02',
        title: 'The Student Leader',
        description: '2nd yers elected as student Leader.',
        tags: ['CR'],
        runtime: '2n year',
        palette: crimson,
      },
      {
        code: 'S02 E03',
        title: 'The Problem Solver',
        description: 'Got intrested in Web Development',
        tags: ['C Language','Html','Css'],
        runtime: '3rd year',
        palette: jade,
      },
    ],
  },
  {
    number: 3,
    title: 'The Engineer',
    period: '2022 – 2026',
    synopsis: 'B. tech Journy starts.',
    episodes: [
      {
        code: 'S03 E01',
        title: '2nd year',
        description: 'Time to choose the domain.',
        tags: ['Full Stck Development', 'Data Science', 'Cyber scurity', 'System Design'],
        runtime: 'May 2024 – Jun 2024',
        palette: ocean,
      },
      {
        code: 'S03 E02',
        title: 'The Developer',
        description: 'Started with Bassic of Web Develpoment and Data Science.',
        tags: ['Html', 'Css', 'JavaScript','Python'],
        runtime: 'Road Map',
        palette: violet,
      },
      {
        code: 'S03 E03',
        title: 'The Struggle',
        description: 'Learnig & use new tool.',
        tags: ['Git / GitHub', 'Deployment'],
        runtime: 'Technical Hub',
        palette: jade,
      },
    ],
  },
  {
    number: 4,
    title: 'Building Real Project',
    period: '2025',
    synopsis: 'Joined Remote internship - Techoctanet Services Pvt. Ltd. (OctaNet).',
    episodes: [
      {
        code: 'S04 E01',
        title: 'The Builder',
        description: 'Web Development Intern .',
        tags: ['javaScript', 'React', 'API'],
        runtime: '2025',
        palette: crimson,
      },
      {
        code: 'S04 E02',
        title: 'The Analysis',
        description: 'Data Science Intern — Cognifyz Technologie.',
        tags: ['Python', 'Panda', 'Numpy'],
        runtime: '2026',
        palette: amber,
      },
      {
        code: 'S04 E03',
        title: 'Hospital Bill Predictor System — Machine Learning / Data Science',
        description: 'Shipped an interactive Streamlit interface for real-time predictions, demonstrating end-to-end machine learning deployment.',
        tags: ['Analysis', 'Streamlit'],
        runtime: '2025',
        palette: ocean,
      },
    ],
  },
  {
    number: 5,
    title: "Graduate CSE Student",
    period: '2026 - Present',
    synopsis: 'Seeking for FULL Stack Development Role.',
    episodes: [
      {
        code: 'S05 E01',
        title: 'The Next Chapter coming soon.',
        description: 'Continue Learning.......',
        tags: ['Gen ai', 'System Design', 'Full stack'],
        runtime: 'In production',
        palette: violet,
      },
    ],
  },
];

export type TopPick = { label: string; title: string; detail: string; palette: Palette };

export const topPicks: TopPick[] = [
  { label: '01', title: 'JavaScript', detail: 'Primary language • production apps', palette: amber },
  { label: '02', title: 'React', detail: 'UI architecture & component systems', palette: ocean },
  { label: '03', title: 'Node.js', detail: 'APIs, auth & server-side logic', palette: jade },
  { label: '04', title: 'Gen AI / RAG', detail: 'LLM apps & multilingual agents', palette: crimson },
  { label: '05', title: 'MongoDB', detail: 'Document data modeling', palette: violet },
  { label: '06', title: 'Express', detail: 'REST services & middleware', palette: amber },
  { label: '07', title: 'TypeScript', detail: 'Typed frontends & safer APIs', palette: ocean },
  { label: '08', title: 'Python', detail: 'ML pipelines & automation', palette: jade },
  { label: '09', title: 'FastAPI', detail: 'High-performance Python APIs', palette: crimson },
  { label: '10', title: 'System Design', detail: 'Scalable architecture thinking', palette: violet },
];

/** Slides for the "▶ Play Intro" cinematic sequence. */
export type IntroSlide = { kicker: string; title: string; lines: string[]; chips?: string[] };

export const introSlides: IntroSlide[] = [
  {
    kicker: 'Education',
    title: 'B.Tech · CSE',
    lines: ['Ramgarh Engineering College, Ramgarh, Jharkhand', 'October 2022 – June 2026'],
    chips: ['CGPA 7.43'],
  },
  {
    kicker: 'Skills',
    title: 'JavaScript first.',
    lines: ['Python, · React, Node.js, Express.js, MongoDB, MySQL · Docker, REST, JWT'],
    chips: ['JavaScript', 'Python', 'React', 'Node.js', 'Docker'],
  },
  {
    kicker: 'Training',
    title: 'The Training Arc',
    lines: ['One to three month of intensive Full‑Stack Development internship', 'Frontend · Backend · Databases · Deployment'],
  },
  {
    kicker: 'Projects',
    title: 'Three Originals',
    lines: ['SevSetu, 92% accuracy', 'Receruit_AI, 99.8% uptime', 'Bill Predication, zero unauthorized access'],
  },
  {
    kicker: 'Achievements',
    title: 'Top Moments',
    lines: ['Tech Fellow — college campus'],
  },
  {
    kicker: 'Certified',
    title: '16 Certifications',
    lines: ['IBM · GFG · Hp · , Post man · Cisco · Udemy'],
  },
  {
    kicker: 'Current mission',
    title: 'Now exploring',
    lines: ['System Design · Cloud Computing (AWS) · Gen Ai '],
  },
];


export type GalleryItem = {
  id: string;
  type: 'image' | 'video';
  /** Path under public/, e.g. /assets/gallery/photo-1.jpg */
  src: string;
  /** Optional poster frame for videos */
  poster?: string;
  title: string;
  caption?: string;
  year?: string;
};

/**
 * Gallery media — drop files into `public/assets/gallery/` then add an entry here.
 * Supported: .jpg .jpeg .png .webp .gif · .mp4 .webm .mov
 */
export const galleryItems: GalleryItem[] = [
  {
    id: 'g1',
    type: 'image',
    src: '/assets/portrait-720.webp',
    title: 'Portrait',
    caption: 'Profile still',
    year: '2026',
  },
  {
    id: 'g2',
    type: 'image',
    src: '/assets/portrait-1100.webp',
    title: 'Portrait — wide',
    caption: 'High-res cut',
    year: '2026',
  },
];

export type ProfileId = 'anshu' | 'founder' | 'client' | 'admin';
export type SectionId = 'about' | 'journey' | 'originals' | 'picks' | 'skills' | 'moments' | 'gallery' | 'story';

export type ViewerCta = {
  label: string;
  /** Section id to scroll to, or a special action handled in Hero */
  action: 'play' | 'resume' | 'hire' | SectionId | 'github';
};

/**
 * "Who's here today?" — each profile answers a real need.
 *  - anshu   : my details & the full story (this page)
 *  - founder : a startup that wants to hire me (work first, clear way to start a project)
 *  - client  : an existing client → private project portal
 *  - admin   : me → site administration
 * Profiles with a `route` are doors: they open that area instead of re-ordering this page.
 */
export const viewerProfiles: {
  id: ProfileId;
  name: string;
  blurb: string;
  /** One-line framing under the hero name */
  tagline: string;
  /** Accent hex for nav underline, pills, profile chrome */
  color: string;
  /** Title above the Continue Watching rail */
  continueTitle: string;
  /** Primary + secondary hero buttons */
  ctas: [ViewerCta, ViewerCta];
  order: SectionId[];
  /** When set, picking this profile navigates here (sign-in required there) */
  route?: string;
}[] = [
  {
    id: 'anshu',
    name: 'About Anshu',
    blurb: 'My details — story, skills & resume',
    tagline: 'The full series. Every episode, in order.',
    color: '#c73e1d',
    continueTitle: 'Continue Exploring',
    ctas: [
      { label: 'Play Intro', action: 'play' },
      { label: 'My Work', action: 'originals' },
    ],
    order: ['about', 'journey', 'originals', 'picks', 'skills', 'moments', 'gallery', 'story'],
  },
  {
    id: 'founder',
    name: 'Startup Founder',
    blurb: 'Hire me — work, services & how to start',
    tagline: 'From idea to a live MVP.',
    color: '#c9a227',
    continueTitle: 'Built for Startups',
    ctas: [
      { label: 'Start a project', action: 'hire' },
      { label: 'See My Work', action: 'originals' },
    ],
    order: ['originals', 'skills', 'moments', 'about', 'story', 'journey', 'picks', 'gallery'],
  },
  {
    id: 'client',
    name: 'Client',
    blurb: 'Your project portal — milestones, files & messages',
    tagline: 'Your project workspace.',
    color: '#2d6a4f',
    continueTitle: 'Continue Exploring',
    ctas: [
      { label: 'Open portal', action: 'hire' },
      { label: 'My Work', action: 'originals' },
    ],
    order: ['about', 'journey', 'originals', 'picks', 'skills', 'moments', 'gallery', 'story'],
    route: '/portal',
  },
];

export const sectionMeta: Record<SectionId, { nav: string; card: string; meta: string; palette: Palette }> = {
  about: { nav: 'About', card: 'About Me', meta: 'The Pilot • Education & training', palette: violet },
  journey: { nav: 'Journey', card: 'My Journey', meta: `${seasons.length} Seasons • ${seasons.reduce((n, s) => n + s.episodes.length, 0)} Episodes`, palette: amber },
  originals: { nav: 'Originals', card: 'My Projects', meta: `${projects.length} Originals • 2026`, palette: crimson },
  picks: { nav: 'Top Picks', card: 'Top Picks', meta: 'Top 10 from the resume', palette: jade },
  skills: { nav: 'Skills', card: 'My Skills', meta: `${skillCategories.length} Categories`, palette: ocean },
  moments: { nav: 'Moments', card: 'My Achievements', meta: `${achievements.length} Moments • ${certifications.length} Certifications`, palette: crimson },
  gallery: { nav: 'Gallery', card: 'Gallery', meta: `${galleryItems.length} Media • Photos & Videos`, palette: amber },
  story: { nav: 'Resume', card: 'The Full Story', meta: 'Resume • View & download', palette: violet },
};
