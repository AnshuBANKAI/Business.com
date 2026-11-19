import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../ui/kit';

const NAV: [string, string, boolean?][] = [
  ['/admin', 'Overview', true], ['/admin/leads', 'Leads'], ['/admin/clients', 'Clients'], ['/admin/projects', 'Client projects'], ['/admin/proposals', 'Proposals'], ['/admin/invoices', 'Invoices'],
  ['/admin/case-studies', 'Case studies'], ['/admin/about', 'About page'], ['/admin/insights', 'Insights'], ['/admin/services', 'Services'], ['/admin/testimonials', 'Testimonials'], ['/admin/faqs', 'FAQs'],
  ['/admin/settings', 'Site settings'], ['/admin/account', 'Account'],
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print border-b border-bone/10 bg-ink-2/60 lg:min-h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <Link to="/admin" className="font-serif text-lg text-bone">Admin</Link>
          <p className="hidden pt-1 text-xs text-smoke lg:block">{user?.email}</p>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV.map(([to, text, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-bone/10 text-bone' : 'text-mist hover:text-bone'}`}>{text}</NavLink>
          ))}
        </nav>
        <div className="hidden space-y-2 px-4 py-6 lg:block">
          <Link to="/" className="block text-sm text-mist hover:text-bone">View public site ↗</Link>
          <Button variant="ghost" small onClick={signOut}>Sign out</Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8"><Outlet /></main>
    </div>
  );
}
