import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/util';

export default function NotFound() {
  usePageMeta('Page not found — Anshu Sharma');
  return (
    <div className="gutter mx-auto max-w-2xl py-28 text-center">
      <p className="font-display text-7xl text-crimson-2">404</p>
      <h1 className="mt-4 font-serif text-3xl text-bone">That page doesn&rsquo;t exist</h1>
      <p className="mt-3 text-mist">The link may be old or mistyped. Here are some useful places to go instead.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary rounded-lg px-5 py-2.5 text-sm">Home</Link>
        <Link to="/#work" className="btn-ghost rounded-lg px-5 py-2.5 text-sm">See my work</Link>
        <Link to="/#contact" className="btn-ghost rounded-lg px-5 py-2.5 text-sm">Start a project</Link>
      </div>
    </div>
  );
}
