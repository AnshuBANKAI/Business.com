# Business gap analysis — what the research said, and where the site stands

*Researched 6 Nov 2026: how freelance developers and software studios present themselves, what founders check before hiring, and India-specific tax, privacy and contract rules. Sources at the bottom.*

## 1. What founders look for before hiring a studio

| Expectation (from the research) | Status |
|---|---|
| Outcome-led headline, one clear action | Done (editable in Admin > Site settings) |
| Case studies that state problem, what was built, **how long it took** and the result | Done; new "My role" and "How long it took" fields |
| Pricing signals / ways of working (fixed price, retainer, hourly) | Done (ways of working on the home page; each service has a price note) |
| Visible process and weekly communication | Done (process section, client portal, "promises" strip) |
| Contract terms visible: IP ownership, NDA, post-launch support | Done (Terms of Service, FAQ, promises) |
| Social proof: testimonials, named clients, references | **Needs you.** The section appears automatically once you add real testimonials |
| Honest case studies (red flag: "every case study looks perfect") | **Needs you.** Add what was hard or what you would do differently |
| Fast, mobile-friendly, accessible | Done (code-split, 11–84 KB images, keyboard/skip-link/aria) |
| Easy contact: form, email, WhatsApp, booking, stated reply time | Done (WhatsApp, booking link and reply time are settings you fill in) |
| Found on Google and shared cleanly | Done (see section 3) |

## 2. India-specific business needs

| Need | What the site does | What you must do |
|---|---|---|
| **GST invoices.** Overseas clients are an export of services, zero-rated, invoiced at 0% under an LUT; domestic clients get CGST+SGST or IGST (18% typical). Invoice needs number, date, supplier/client details, SAC, tax lines. | Invoice builder with the three tax treatments, financial-year numbering (e.g. 2026-27/001, never reused), the required LUT wording, frozen supplier details, printable PDF | Confirm with a CA whether you must register (the ₹20 lakh threshold applies to domestic + export turnover), file the LUT before your first export invoice each financial year, and file GST returns even for zero-rated exports |
| **SAC code** | Defaults to 998314 (IT design & development) and is editable | Confirm the code with your CA (some sources list 998313 for consulting) |
| **Getting paid from abroad** | Optional payment-link field per invoice plus bank details | Open a Razorpay (or similar) international account. Fees quoted by Razorpay were about 3% for global cards and 1% for bank transfers; check current pricing. Payments should be realised within 1 year under the LUT |
| **DPDP Act privacy duties.** Rules notified Nov 2025; notice and consent duties apply from about May 2027. | Consent checkbox on the form (timestamp + policy version stored), Privacy Policy, published grievance contact, deletion by admin | Fill in the privacy contact; have a lawyer review the Privacy Policy |
| **Contracts online.** Section 10A of the IT Act recognises electronic contracts, but click-accept is less tested in court than a digital signature. | Proposal acceptance records name, email, time, IP and a hash of the exact terms | For large engagements consider an Aadhaar eSign/DSC contract and ask a lawyer about stamp duty |

## 3. SEO & sharing (React sites are normally invisible to crawlers; fixed here)
Real `<title>`, description, canonical, Open Graph, Twitter and JSON-LD (ProfessionalService/Person/CreativeWork) are injected into the HTML by the server for every public page; live `sitemap.xml`; `robots.txt` blocking admin/portal/API; real 404 status codes; 1200×630 share image. **Needs you:** submit the sitemap in Google Search Console and add a Google Business/LinkedIn presence.

## 4. Status of the earlier "still open" list
| Item | Status |
|---|---|
| Two-factor sign-in for admin | **Done** (also available to clients) |
| Editable About page | **Done** (Admin > About page) |
| Email reminders (invoices, approvals, stale leads) | **Done** (daily job + summary + "Run now") |
| Blog / insights | **Done** (Admin > Insights, RSS, sitemap) |
| Production readiness (health checks, startup checks, compression, error screens, deployment guide, dependency audit) | **Done**; see DEPLOYMENT_GUIDE.md |
| Payment gateway inside the portal | Open: needs your Razorpay/Stripe keys |
| Analytics and error monitoring | Open: pick a provider (needs a small CSP change) |
| Client logos, reviews, testimonials, honest case-study details | Open: only you can supply these |
| Move uploads to cloud storage (S3/Cloudinary) | Open: removes the persistent-disk requirement |

## Sources
- Freelance/agency site structure: HubSpot-style freelancer guides, ONES "Anatomy of a high-converting software agency website", Teamseven "How to vet a software development agency", Utsubo "How to evaluate a web agency", Codica "9 software agency red flags".
- GST on exports, LUT, invoice format: Wisemonk (Freelancer invoice format for foreign clients; GST mistakes), Xflowpay (GST for freelancers; export of services), Taxguru, IncorpX.
- SAC code 998314: Vakilsearch, BUSY, TaxGarden.
- DPDP Rules 2025: KPMG guidance, Protiviti flash update, CookieYes timeline, SCC Online summary.
- E-contracts: iPleaders on clickwrap, Leegality, Mondaq, Lakshmikumaran & Sridharan.
- International payments: Razorpay International Payments pages and blog.
*Tax and legal points are summarised for orientation, not advice. Confirm with a chartered accountant and a lawyer.*
