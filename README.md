> **Freelance version:** see [FREELANCE_SETUP.md](./FREELANCE_SETUP.md) for the public site, admin panel and client portal.

# Anshu — THE SERIES

A cinematic, Japanese-inspired streaming-style portfolio for **Anshu-Sharma**: Full-Stack Developer and B.Tech CSE student.
Every section is an episode, every project is an Original, and the whole site plays like a series.

> A personal portfolio with a fictional streaming-platform look, restyled with Japanese aesthetics (sumi ink, washi, vermillion, kin gold). It is not affiliated with Netflix or any other streaming service and uses none of their logos.

## Project layout

```
frontend/   React + Vite app (src/, public/, vite.config.ts)
backend/    Express + MongoDB API (src/, test/, scripts/, .env.example)
shared/     site-content.json, used by the front-end offline fallback and by the seed script
```

## Run it locally

Requires **Node.js 20+** (see `.nvmrc`).

```bash
npm install                            # root tools (concurrently)
npm run setup                          # installs frontend/ and backend/ dependencies
cp backend/.env.example backend/.env   # then edit backend/.env
npm run seed                           # creates your admin + starter content
npm run dev                            # web on :5173, API on :4000
```

Open http://localhost:5173. To run only one side: `npm run dev:web` or `npm run dev:api`.

Production: `npm run build` (writes `frontend/dist/`), then `NODE_ENV=production npm start`.
The Express server serves `frontend/dist/` and the API from one origin.

## Updating the content

**All content lives in one file: [`frontend/src/data/portfolio.ts`](frontend/src/data/portfolio.ts).** It was generated from the resume, and every component reads from it.

| To change… | Edit |
| --- | --- |
| Name, intro, email, LinkedIn, GitHub | `profile` |
| A project, or a new one | `projects` (add an object; it appears in Originals, the overlay, the resume sheet and the counts) |
| Achievements / certifications | `achievements`, `certifications` |
| Skills and their "where it's used" notes | `skillCategories`, `skillEvidence` |
| Seasons and episodes (My Journey) | `seasons` |
| Top 10 row | `topPicks` |
| ▶ Play Intro highlight reel | `introSlides` |
| Profile order (Recruiter / Developer / Creative) | `viewerProfiles` |
| Opening studio card text | `profile.originalLabel` |

**Resume:** replace `frontend/public/assets/Anshu_Resume.pdf`.

**Gallery:** put photos/videos in `frontend/public/assets/gallery/`, then add entries to `galleryItems` in `frontend/src/data/portfolio.ts`. On the live site you can also drag files into the Gallery section for a temporary browser preview.

**Photo:** replace `pic1.JPG` (high-res photo) and `pic.png` (background-removed cutout with the same framing), then run:

```bash
npm run images
```

This rebuilds the responsive WebP portraits and the social share image in `frontend/public/assets/`.

## What's inside

```
src/
  data/portfolio.ts        ← single source of truth (from the resume)
  App.tsx                  ← stages: opening → profile select → home; overlays
  components/
    OpeningSequence        ← black → studio card → ANSHU → THE SERIES → portrait → ▶ PLAY
    ProfileSelector        ← "Who's watching?" (changes section order only)
    Navbar                 ← hide-on-scroll nav, profile switcher, mobile menu
    Hero                   ← billboard: parallax portrait, particles, light streaks, floating chips
    PlayIntro              ← ▶ Play Intro: zoom into portrait → highlight reel (pause, ← →, tap zones)
    ContinueWatching       ← cards with real "watched" progress bars
    About                  ← The Pilot
    Seasons / EpisodeCard  ← My Journey as seasons and episodes
    Originals / ProjectCard← pinned horizontal sequence on desktop, swipe rail on touch
    ProjectModal           ← full-screen project overlay with a shared-element transition
    TopPicks               ← Top 10-style row
    Skills                 ← skill genres; each card shows where the skill appears
    Achievements           ← award-poster cards + certification rail (links to credentials)
    ResumeViewer/ResumeModal ← designed resume sheet, PDF viewer, download
    FinalCTA               ← TO BE CONTINUED… + contact links
    CustomCursor, fx.tsx   ← cursor states, magnetic buttons, 3D tilt, text reveals, particles
  hooks/                   ← Lenis smooth scroll + scroll lock, media queries, watch progress
scripts/build-images.mjs   ← portrait/share-image pipeline (sharp)
```

**Stack:** React 18, TypeScript, Vite 6, Tailwind CSS 4, Framer Motion 11, Lenis.

## Accessibility and performance

- `prefers-reduced-motion` is respected: smooth scroll, the custom cursor, tilt, particles, grain and the pinned horizontal scroll turn off, and the opening jumps straight to its final frame.
- Hover effects only run on devices with a precise pointer. Touch devices get tap interactions and native swipe rails.
- The custom cursor appears only with a mouse or trackpad.
- Overlays close with Esc, and the highlight reel supports Space and the ← → keys.
- Portraits are responsive WebP files (25–90 KB). Overlays are code-split, and particles pause when they're off screen.

## Keyboard shortcuts

- **Opening:** Enter or Esc skips it.
- **Play Intro:** Space pauses, ← and → change slides, Esc closes.
- **Project and resume overlays:** Esc closes.
