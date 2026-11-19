import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { Post } from '../lib/types';
import { readingMinutes } from '../lib/markdown';
import { fmtDate, usePageMeta } from '../lib/util';
import Markdown from '../ui/Markdown';
import { Spinner } from '../ui/kit';

export function InsightsList() {
  usePageMeta('Insights — Anshu Sharma', 'Practical notes on building MVPs, working with a freelance developer, and shipping AI features.');
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { api.get<Post[]>('/api/public/posts').then(setPosts).catch(() => setErr(true)); }, []);

  return (
    <div className="gutter mx-auto max-w-4xl py-14 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-crimson-2">Insights</p>
      <h1 className="mt-2 font-serif text-4xl text-bone sm:text-5xl">Notes on building products</h1>
      <p className="mt-4 max-w-2xl text-lg text-mist">Practical advice for founders on MVPs, working with a freelance developer, and shipping AI features.</p>
      {err && <p className="mt-10 text-mist">Articles couldn&rsquo;t load right now. Please try again shortly.</p>}
      {!posts && !err && <Spinner />}
      {posts?.length === 0 && <p className="mt-10 text-mist">First articles coming soon.</p>}
      <ul className="mt-10 space-y-6">
        {posts?.map((p) => (
          <li key={p._id}>
            <Link to={`/insights/${p.slug}`} className="group block overflow-hidden rounded-xl border border-bone/10 bg-ink-2/60 transition hover:border-bone/30 sm:flex">
              {p.coverImage && <img src={p.coverImage} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover sm:aspect-auto sm:w-64" />}
              <div className="p-6">
                <p className="text-xs text-smoke">{fmtDate(p.publishedAt)}</p>
                <h2 className="mt-1.5 font-serif text-2xl text-bone group-hover:underline">{p.title}</h2>
                <p className="mt-2 text-mist">{p.excerpt}</p>
                {p.tags.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5">{p.tags.map((t) => <li key={t} className="rounded-full border border-bone/15 px-2.5 py-0.5 text-[11px] text-mist">{t}</li>)}</ul>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InsightPost() {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    setPost(null); setMissing(false);
    api.get<Post>(`/api/public/posts/${encodeURIComponent(slug)}`).then(setPost).catch((e) => setMissing(e instanceof ApiError ? e.status === 404 : true));
  }, [slug]);
  usePageMeta(post ? `${post.title} | Anshu Sharma` : 'Insights | Anshu Sharma', post?.excerpt);

  if (missing) return <div className="gutter mx-auto max-w-3xl py-32 text-center"><h1 className="font-serif text-3xl text-bone">Article not found</h1><Link to="/insights" className="mt-6 inline-block text-mist underline">All articles</Link></div>;
  if (!post) return <Spinner />;
  return (
    <article className="gutter mx-auto max-w-3xl py-14 sm:py-20">
      <Link to="/insights" className="text-sm text-mist hover:text-bone">← All articles</Link>
      <p className="mt-8 text-xs text-smoke">{fmtDate(post.publishedAt)} · {readingMinutes(post.body)} min read</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-bone sm:text-5xl">{post.title}</h1>
      {post.excerpt && <p className="mt-4 text-xl text-mist">{post.excerpt}</p>}
      {post.coverImage && <img src={post.coverImage} alt="" className="mt-8 w-full rounded-xl border border-bone/10" />}
      <div className="mt-8"><Markdown source={post.body} /></div>
      {post.tags.length > 0 && <ul className="mt-10 flex flex-wrap gap-2">{post.tags.map((t) => <li key={t} className="rounded-full border border-bone/15 px-3 py-1 text-xs text-mist">{t}</li>)}</ul>}
      <div className="mt-14 rounded-xl border border-bone/10 bg-ink-2/60 p-8 text-center">
        <p className="font-serif text-2xl text-bone">Building something?</p>
        <p className="mt-2 text-mist">Tell me about your project and I&rsquo;ll reply within 1–2 working days.</p>
        <Link to="/#contact" className="btn-primary mt-5 inline-block rounded-lg px-6 py-3 text-sm">Start a project</Link>
      </div>
    </article>
  );
}
