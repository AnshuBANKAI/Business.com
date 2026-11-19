import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router-dom';

const STALE_BUNDLE = /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch dynamically/i;

/**
 * Shown instead of a blank screen when a page crashes. The most common cause after a new deploy is an open browser tab
 * still pointing at files that no longer exist; that case reloads once automatically.
 */
export default function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error ?? '');
  const stale = STALE_BUNDLE.test(message);

  useEffect(() => {
    if (!stale) return;
    try {
      if (sessionStorage.getItem('reloaded-for-update')) return; // only once, to avoid a reload loop
      sessionStorage.setItem('reloaded-for-update', '1');
    } catch { /* storage blocked: fall through to the manual button */ }
    window.location.reload();
  }, [stale]);

  if (import.meta.env.DEV) console.error(error);

  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="max-w-md text-center">
        <p className="font-display text-6xl text-crimson-2">{stale ? '↻' : '!'}</p>
        <h1 className="mt-4 font-serif text-3xl text-bone">{stale ? 'The site was just updated' : 'Something went wrong'}</h1>
        <p className="mt-3 text-mist">{stale ? 'A newer version is available. Reload to continue.' : 'The page hit an unexpected problem. Your data is safe. Try reloading, or head back home.'}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="btn-primary rounded-lg px-5 py-2.5 text-sm" onClick={() => window.location.reload()}>Reload page</button>
          <Link to="/" className="btn-ghost rounded-lg px-5 py-2.5 text-sm" reloadDocument>Go home</Link>
        </div>
      </div>
    </div>
  );
}
