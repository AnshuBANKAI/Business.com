import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { galleryItems, type GalleryItem } from '../data/portfolio';
import { EASE, SectionHeading } from './fx';

type Filter = 'all' | 'image' | 'video';

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** YouTube-style player — user controls playback fully */
function VideoPlayer({ item }: { item: GalleryItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [showUi, setShowUi] = useState(true);
  const [started, setStarted] = useState(false); // user has pressed play at least once

  const clearHide = () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowUi(false);
    }, 2500);
  }, []);

  const revealUi = useCallback(() => {
    setShowUi(true);
    scheduleHide();
  }, [scheduleHide]);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play()
      .then(() => {
        setPlaying(true);
        setStarted(true);
        scheduleHide();
      })
      .catch(() => {});
  }, [scheduleHide]);

  const pause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setPlaying(false);
    setShowUi(true);
    clearHide();
  }, []);

  const togglePlay = useCallback(() => {
    if (videoRef.current?.paused) play();
    else pause();
  }, [play, pause]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const onVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  }, []);

  const onSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = videoRef.current;
      if (!v || !duration) return;
      const t = (Number(e.target.value) / 100) * duration;
      v.currentTime = t;
      setCurrent(t);
      setProgress(Number(e.target.value));
    },
    [duration],
  );

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  // media events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => {
      setCurrent(v.currentTime);
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
      if (v.buffered.length > 0 && v.duration) {
        setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
      }
    };
    const onMeta = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      setShowUi(true);
    };
    const onEnded = () => {
      setPlaying(false);
      setShowUi(true);
      setProgress(100);
    };

    v.addEventListener('timeupdate', onTime);
    v.addEventListener('progress', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);

    // Do NOT autoplay — user starts like YouTube
    v.pause();
    setPlaying(false);
    setStarted(false);
    setShowUi(true);

    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('progress', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
      v.pause();
      clearHide();
    };
  }, [item.id]);

  // keyboard like YouTube
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const v = videoRef.current;
      if (!v) return;

      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
        revealUi();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - 5);
        revealUi();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        revealUi();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = Math.min(1, (v.volume || 0) + 0.05);
        v.volume = next;
        v.muted = false;
        setVolume(next);
        setMuted(false);
        revealUi();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.max(0, (v.volume || 0) - 0.05);
        v.volume = next;
        setVolume(next);
        setMuted(next === 0);
        revealUi();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, toggleMute, toggleFullscreen, revealUi]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded-md bg-black shadow-2xl"
      onMouseMove={revealUi}
      onMouseLeave={() => {
        if (playing) setShowUi(false);
      }}
    >
      <video
        key={item.id}
        ref={videoRef}
        src={item.src}
        poster={item.poster}
        playsInline
        preload="metadata"
        className="max-h-[70vh] w-full max-w-full cursor-pointer object-contain"
        onClick={togglePlay}
      >
        <source src={item.src} type="video/mp4" />
        <source src={item.src} type="video/webm" />
      </video>

      {/* Big center play — like YouTube before / when paused */}
      <AnimatePresence>
        {(!started || !playing) && showUi && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={togglePlay}
            className="absolute left-1/2 top-1/2 z-[2] flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-3xl text-white shadow-lg ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-crimson hover:ring-crimson"
            aria-label="Play"
          >
            ▶
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom control bar — YouTube style */}
      <div
        className={`absolute inset-x-0 bottom-0 z-[3] transition-opacity duration-300 ${
          showUi ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 pb-2 pt-12 sm:px-3 sm:pb-3">
          {/* Progress track */}
          <div className="group/seek relative mb-2 h-1 touch-none sm:h-1.5">
            <div className="absolute inset-0 rounded-full bg-white/20" />
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${buffered}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-crimson" style={{ width: `${progress}%` }} />
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progress}
              onChange={onSeek}
              onMouseDown={() => clearHide()}
              onMouseUp={scheduleHide}
              aria-label="Seek"
              className="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0"
            />
            <div
              className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-crimson opacity-0 shadow transition group-hover/seek:opacity-100"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <div className="group/vol flex items-center">
              <button
                type="button"
                onClick={toggleMute}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
                aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
              >
                {muted || volume === 0 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 9v6h4l5 5V4l-5 5H7z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={onVolume}
                aria-label="Volume"
                className="ml-0 h-1 w-0 origin-left cursor-pointer appearance-none rounded-full bg-white/30 accent-white transition-all duration-200 group-hover/vol:ml-1 group-hover/vol:w-20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            {/* Time */}
            <span className="ml-1 select-none text-[11px] tabular-nums text-white/90 sm:text-xs">
              {formatTime(current)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
              aria-label="Fullscreen"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Gallery() {
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState<GalleryItem | null>(null);

  const items = galleryItems.filter((i) => filter === 'all' || i.type === filter);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) setActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <>
      <SectionHeading
        kicker="Visuals"
        title="Gallery"
        aside={
          <p className="max-w-xs text-sm leading-relaxed text-mist">
            Photos and videos from work, campus, and builds.
          </p>
        }
      />

      <div className="gutter mb-6 flex flex-wrap items-center gap-2">
        {([
          ['all', 'All'],
          ['image', 'Photos'],
          ['video', 'Videos'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition ${
              filter === id ? 'bg-bone text-ink' : 'border border-white/15 text-mist hover:border-white/30 hover:text-bone'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-smoke">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="gutter">
        {items.length === 0 ? (
          <p className="py-16 text-center text-sm text-smoke">No media in this filter yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {items.map((item, i) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.04, 0.24), ease: EASE }}
              >
                <button
                  type="button"
                  onClick={() => setActive(item)}
                  data-cursor="play"
                  className="group relative aspect-[4/5] w-full overflow-hidden rounded-md bg-ink-2 ring-1 ring-white/10 transition duration-400 hover:ring-white/25"
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.src}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <>
                      <video
                        src={item.src}
                        poster={item.poster}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-2 top-2 rounded bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-wider text-bone backdrop-blur">
                        VIDEO
                      </span>
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-bone backdrop-blur transition group-hover:scale-110">
                          ▶
                        </span>
                      </span>
                    </>
                  )}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-10 text-left">
                    <span className="block truncate text-sm font-semibold text-bone">{item.title}</span>
                    {item.year && <span className="text-[10px] font-medium tracking-wide text-mist">{item.year}</span>}
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
            onClick={() => setActive(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-medium text-bone hover:bg-white/10"
              onClick={() => setActive(null)}
            >
              Close
            </button>
            <motion.div
              className="relative flex max-h-[88vh] w-full max-w-[min(96vw,1100px)] flex-col items-center"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              {active.type === 'image' ? (
                <img
                  src={active.src}
                  alt={active.title}
                  className="max-h-[80vh] w-auto max-w-full rounded-md object-contain shadow-2xl"
                />
              ) : (
                <VideoPlayer item={active} />
              )}
              <div className="mt-3 text-center">
                <p className="font-display text-2xl tracking-wide text-bone">{active.title}</p>
                {active.caption && <p className="mt-1 text-sm text-mist">{active.caption}</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
