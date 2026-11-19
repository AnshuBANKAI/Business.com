import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider, RequireRole } from './lib/auth';
import SiteLayout from './site/SiteLayout';
import RouteError from './ui/RouteError';
import Home from './site/Home';

const WorkDetail = lazy(() => import('./site/WorkDetail'));
const About = lazy(() => import('./site/About'));
const legal = () => import('./site/Legal');
const Privacy = lazy(() => legal().then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => legal().then((m) => ({ default: m.Terms })));
const NotFound = lazy(() => import('./site/NotFound'));
const ins = () => import('./site/Insights');
const Insights = lazy(() => ins().then((m) => ({ default: m.InsightsList })));
const InsightPost = lazy(() => ins().then((m) => ({ default: m.InsightPost })));
const SeriesPage = lazy(() => import('./pages/SeriesPage'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const Overview = lazy(() => import('./admin/Overview'));
const AboutAdmin = lazy(() => import('./admin/AboutAdmin'));
const Leads = lazy(() => import('./admin/Leads'));
const Clients = lazy(() => import('./admin/Clients'));
const Settings = lazy(() => import('./admin/Settings'));
const ResourceManager = lazy(() => import('./admin/ResourceManager'));
const loginPages = () => import('./pages/Login');
const Login = lazy(() => loginPages().then((m) => ({ default: m.Login })));
const AcceptInvite = lazy(() => loginPages().then((m) => ({ default: m.AcceptInvite })));
const portal = () => import('./portal/Portal');
const PortalLayout = lazy(() => portal().then((m) => ({ default: m.PortalLayout })));
const PortalHome = lazy(() => portal().then((m) => ({ default: m.PortalHome })));
const PortalProject = lazy(() => portal().then((m) => ({ default: m.PortalProject })));
const PortalAccount = lazy(() => portal().then((m) => ({ default: m.PortalAccount })));
const pb = () => import('./portal/PortalBilling');
const PortalInvoices = lazy(() => pb().then((m) => ({ default: m.PortalInvoices })));
const PortalInvoice = lazy(() => pb().then((m) => ({ default: m.PortalInvoice })));
const PortalProposals = lazy(() => pb().then((m) => ({ default: m.PortalProposals })));
const PortalProposal = lazy(() => pb().then((m) => ({ default: m.PortalProposal })));
const ab = () => import('./admin/Billing');
const InvoiceList = lazy(() => ab().then((m) => ({ default: m.InvoiceList })));
const InvoiceEdit = lazy(() => ab().then((m) => ({ default: m.InvoiceEdit })));
const ProposalList = lazy(() => ab().then((m) => ({ default: m.ProposalList })));
const ProposalEdit = lazy(() => ab().then((m) => ({ default: m.ProposalEdit })));
const adminSettings = () => import('./admin/Settings');
const AdminAccount = lazy(() => adminSettings().then((m) => ({ default: m.AdminAccount })));
const cp = () => import('./admin/ClientProjects');
const ClientProjectList = lazy(() => cp().then((m) => ({ default: m.ClientProjectList })));
const ClientProjectEdit = lazy(() => cp().then((m) => ({ default: m.ClientProjectEdit })));

import { CONFIGS } from './admin/configs';

const Fallback = () => <p className="py-24 text-center text-sm text-mist">Loading…</p>;
const rm = (key: keyof typeof CONFIGS) => <ResourceManager key={key} cfg={CONFIGS[key]} />;

const router = createBrowserRouter([
  {
    errorElement: <RouteError />, // any crash inside any page shows a friendly screen instead of a blank one
    children: [
    { element: <SiteLayout />, children: [{ path: '/', element: <Home /> }, { path: '/work/:slug', element: <WorkDetail /> }, { path: '/about', element: <About /> }, { path: '/insights', element: <Insights /> }, { path: '/insights/:slug', element: <InsightPost /> }, { path: '/privacy', element: <Privacy /> }, { path: '/terms', element: <Terms /> }, { path: '*', element: <NotFound /> }] },
    { path: '/series', element: <SeriesPage /> },
    { path: '/login', element: <Login /> },
    { path: '/accept-invite', element: <AcceptInvite /> },
    {
      path: '/admin',
      element: <RequireRole role="admin"><AdminLayout /></RequireRole>,
      children: [
        { index: true, element: <Overview /> },
        { path: 'leads', element: <Leads /> },
        { path: 'clients', element: <Clients /> },
        { path: 'projects', element: <ClientProjectList /> },
        { path: 'projects/:id', element: <ClientProjectEdit /> },
        { path: 'invoices', element: <InvoiceList /> },
        { path: 'invoices/:id', element: <InvoiceEdit /> },
        { path: 'proposals', element: <ProposalList /> },
        { path: 'proposals/:id', element: <ProposalEdit /> },
        { path: 'case-studies', element: rm('projects') },
        { path: 'about', element: <AboutAdmin /> },
        { path: 'insights', element: rm('posts') },
        { path: 'services', element: rm('services') },
        { path: 'testimonials', element: rm('testimonials') },
        { path: 'faqs', element: rm('faqs') },
        { path: 'settings', element: <Settings /> },
        { path: 'account', element: <AdminAccount /> },
      ],
    },
    {
      path: '/portal',
      element: <RequireRole role="client"><PortalLayout /></RequireRole>,
      children: [
        { index: true, element: <PortalHome /> },
        { path: 'projects/:id', element: <PortalProject /> },
        { path: 'proposals', element: <PortalProposals /> },
        { path: 'proposals/:id', element: <PortalProposal /> },
        { path: 'invoices', element: <PortalInvoices /> },
        { path: 'invoices/:id', element: <PortalInvoice /> },
        { path: 'account', element: <PortalAccount /> },
      ],
    },
  ],
  },
]);

export default function AppRouter() {
  return (
    <AuthProvider>
      <Suspense fallback={<Fallback />}><RouterProvider router={router} /></Suspense>
    </AuthProvider>
  );
}
