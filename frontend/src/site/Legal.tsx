import { Link } from 'react-router-dom';
import { useSite } from './SiteLayout';
import { LEGAL_UPDATED, usePageMeta } from '../lib/util';

function Doc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="gutter mx-auto max-w-3xl py-14 sm:py-20">
      <h1 className="font-serif text-4xl text-bone">{title}</h1>
      <p className="mt-2 text-sm text-smoke">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-mist [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-bone [&_li]:ml-5 [&_li]:list-disc [&_a]:text-bone [&_a]:underline">{children}</div>
    </article>
  );
}

function useBusiness() {
  const { data } = useSite();
  const s = data?.settings;
  const name = s?.legalName || s?.brandName || 'Anshu Sharma';
  const email = s?.grievanceEmail || s?.email || '';
  return { s, name, email, contact: email ? <a href={`mailto:${email}`}>{email}</a> : <>the email address on the contact section of this site</> };
}

export function Privacy() {
  usePageMeta('Privacy Policy — Anshu Sharma', 'How personal data is collected and used on this website and in the client portal.');
  const { s, name, contact } = useBusiness();
  return (
    <Doc title="Privacy Policy">
      <p>This policy explains what personal data {name} (&ldquo;I&rdquo;, &ldquo;me&rdquo;) collects through this website and the client portal, why, and what your choices are. I am the &ldquo;data fiduciary&rdquo; for this data under India&rsquo;s Digital Personal Data Protection Act, 2023.</p>

      <h2>What I collect</h2>
      <ul>
        <li><strong>Enquiry form:</strong> your name, email, company (optional), budget, timeline and the message you write.</li>
        <li><strong>Client portal:</strong> your name, email and company; messages, files and approvals you share about your project; and invoice and proposal records, including the name, time, IP address and browser details recorded when you accept a proposal.</li>
        <li><strong>Technical data:</strong> a single essential cookie that keeps you signed in, and standard server logs (IP address, pages requested, time) used for security.</li>
      </ul>

      <h2>Why I use it</h2>
      <ul>
        <li>To reply to your enquiry and prepare a quote or proposal (based on your consent when you submit the form).</li>
        <li>To deliver the project you hired me for, send updates and issue invoices.</li>
        <li>To keep accounting and tax records that the law requires me to keep.</li>
        <li>To keep the site and portal secure.</li>
      </ul>

      <h2>Cookies</h2>
      <p>This site uses only the essential cookie needed to keep you signed in to the portal or admin area. I don&rsquo;t use advertising or tracking cookies.</p>

      <h2>Who it is shared with</h2>
      <p>I don&rsquo;t sell your data. It is processed on my behalf by service providers I use to run the business, such as hosting and database providers and an email delivery service. They may only use it to provide those services. I may disclose data if the law requires it.</p>

      <h2>How long I keep it</h2>
      <p>Enquiries that don&rsquo;t become projects are deleted or anonymised within 12 months. Client and project records are kept for the life of the engagement and afterwards for as long as needed to meet legal, tax and accounting obligations (typically several years), then deleted.</p>

      <h2>Your rights</h2>
      <p>You can ask me to give you a summary of the data I hold about you, correct it, or erase it, and you can withdraw your consent at any time. Withdrawing consent is as easy as giving it: just email {contact}. Some records (such as issued invoices) may have to be kept by law even after you ask for erasure.</p>

      <h2>Security</h2>
      <p>Accounts are protected by hashed passwords and signed, HTTP-only session cookies. Files you upload are stored privately and are available only to you and me. No system is perfectly secure; if a breach affecting your data occurs, I will notify you and the authorities as the law requires.</p>

      <h2>Children</h2>
      <p>This site is for businesses and adults. I don&rsquo;t knowingly collect data from children.</p>

      <h2>Grievances and contact</h2>
      <p>For any question or complaint about your data, contact {s?.grievanceName || name}{s?.address ? `, ${s.address}` : ''}: {contact}. I aim to respond within {s?.responseTime || '2 working days'}. If you are not satisfied, you may complain to the Data Protection Board of India.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, I will update the date above and, where required, ask for your consent again.</p>
      <p><Link to="/terms">Terms of Service →</Link></p>
    </Doc>
  );
}

export function Terms() {
  usePageMeta('Terms of Service — Anshu Sharma', 'The terms on which software development services are provided.');
  const { name, contact } = useBusiness();
  return (
    <Doc title="Terms of Service">
      <p>These terms apply to software development, design and consulting services provided by {name} (&ldquo;I&rdquo;, &ldquo;me&rdquo;) to you (&ldquo;the client&rdquo;), together with the written proposal you accept for each project. If a proposal conflicts with these terms, the proposal wins for that project.</p>

      <h2>1. Scope and proposals</h2>
      <p>Each project starts with a written proposal that sets out the deliverables, timeline, price and payment schedule. Work begins once you accept the proposal and any advance payment it states is received. Anything not listed in the proposal is out of scope and is handled as a change request.</p>

      <h2>2. Changes</h2>
      <p>If you want something added or changed, I will tell you the effect on price and timeline before doing the work. Changes take effect only when you agree to them in writing (the project messages in your portal count as writing).</p>

      <h2>3. Your responsibilities</h2>
      <p>You will provide the content, access, feedback and approvals I reasonably need, on time. Delays on your side can move delivery dates. You confirm that materials you give me are yours to use.</p>

      <h2>4. Milestones and approval</h2>
      <p>Work is delivered in milestones. I mark a milestone as delivered, and you approve it or request changes through the portal. If you don&rsquo;t respond within 7 days of a reminder, I may treat the milestone as accepted.</p>

      <h2>5. Fees and payment</h2>
      <p>Fees, currency and the payment schedule are stated in the proposal and on each invoice. Invoices are due by the date shown. Tax is added as the law requires: services for clients outside India are generally exported under a Letter of Undertaking without IGST; services for clients in India carry GST. Bank or payment-gateway charges on your side are yours to bear. I may pause work on invoices that are overdue.</p>

      <h2>6. Ownership of the work</h2>
      <p>When the final invoice for a project is paid in full, you own the custom code and assets I created specifically for you. Until then I keep ownership. Open-source libraries and third-party tools remain under their own licences, and my pre-existing tools and know-how stay mine, with a licence to you to use them as part of the deliverable. I may describe the project and show non-confidential screenshots in my portfolio unless you ask me not to in writing.</p>

      <h2>7. Confidentiality</h2>
      <p>I will keep your non-public business and technical information confidential and use it only for your project. An NDA is available on request and will be signed before you share sensitive material. This does not apply to information that is public, that I already knew, or that I must disclose by law.</p>

      <h2>8. Warranty and support</h2>
      <p>I will carry out the work with reasonable skill and care. For 14 days after final delivery I will fix defects in what I delivered at no charge; ongoing support and new features are handled under a separate agreement. Software depends on third-party services and platforms outside my control, and I can&rsquo;t guarantee uninterrupted or error-free operation.</p>

      <h2>9. Limitation of liability</h2>
      <p>To the extent the law allows, I am not liable for indirect or consequential loss, such as lost profits or lost data, and my total liability for any claim relating to a project is limited to the fees you paid me for that project.</p>

      <h2>10. Ending a project</h2>
      <p>Either of us may end a project with written notice. You will pay for work completed and costs incurred up to the notice date, and any advance already paid for work I have started is not refundable beyond that. Sections on ownership, confidentiality, payment and liability continue after the project ends.</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of India. We will try to resolve any dispute by talking first; if that fails, the courts of competent jurisdiction in India will decide it.</p>

      <h2>12. Contact</h2>
      <p>Questions about these terms: {contact}.</p>
      <p><Link to="/privacy">Privacy Policy →</Link></p>
    </Doc>
  );
}
