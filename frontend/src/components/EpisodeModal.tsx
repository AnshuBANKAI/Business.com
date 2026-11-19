import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Episode, Season } from '../data/portfolio';
import { EASE } from './fx';
import { PosterBackdrop } from './Poster';

const block = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export default function EpisodeModal({
  episode,
  season,
  onClose,
  onSwitch,
}: {
  episode: Episode;
  season: Season;
  onClose: () => void;
  onSwitch?: (ep: Episode) => void;
}) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [seasonCode, epCode] = episode.code.split(' ');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, episode.code]);

  const others = season.episodes.filter((e) => e.code !== episode.code);

  return (
    <motion.div
      className="fixed inset-0 z-[160] flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="dialog"
      aria-modal="true"
      aria-label={episode.title}
    >
      <button type="button" className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-label="Close" onClick={onClose} />

      <motion.div
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-ink-2 shadow-2xl ring-1 ring-white/10 sm:mx-4 sm:rounded-2xl"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {/* hero art */}
        <div className="relative aspect-[16/9] shrink-0 sm:aspect-[21/9]">
          <PosterBackdrop palette={episode.palette}>
            <span className="absolute -bottom-8 right-4 font-display text-[9rem] leading-none text-white/[0.08]">{epCode}</span>
          </PosterBackdrop>
          <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-ink-2/40 to-transparent" />
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-sm font-medium text-bone backdrop-blur hover:bg-white/10"
          >
            Close
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-crimson-2">
              {seasonCode} · Episode {epCode?.replace('E', '')} · {episode.runtime}
            </p>
            <h2 className="font-display text-4xl leading-none tracking-wide text-bone sm:text-5xl">{episode.title}</h2>
          </div>
        </div>

        {/* body */}
        <div className="overflow-y-auto px-5 py-6 sm:px-8 sm:pb-10">
          <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.07, delayChildren: 0.1 }}>
            <motion.p variants={block} className="text-[15px] leading-relaxed text-bone/85 sm:text-base">
              {episode.description}
            </motion.p>

            <motion.div variants={block} className="mt-6">
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-crimson-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {episode.tags.map((t) => (
                  <span key={t} className="glass rounded-full px-3 py-1.5 text-sm font-medium text-bone">
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div variants={block} className="mt-8 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-smoke">Season</p>
              <p className="mt-1 font-display text-2xl tracking-wide text-bone">
                S{String(season.number).padStart(2, '0')} — {season.title}
              </p>
              <p className="mt-1 text-sm text-mist">
                {season.period} · {season.synopsis}
              </p>
            </motion.div>

            {others.length > 0 && onSwitch && (
              <motion.section variants={block} className="mt-10 border-t border-white/10 pt-6">
                <h3 className="mb-4 font-sans text-sm font-semibold text-bone">More in this season</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {others.map((ep) => (
                    <button
                      key={ep.code}
                      type="button"
                      data-cursor="play"
                      onClick={() => onSwitch(ep)}
                      className="group relative overflow-hidden rounded-xl text-left ring-1 ring-white/10 transition hover:ring-white/25"
                    >
                      <div className="aspect-video">
                        <PosterBackdrop palette={ep.palette}>
                          <span className="absolute bottom-3 left-3 font-display text-xl text-bone">{ep.title}</span>
                        </PosterBackdrop>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.section>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
