// Daily reminders. Every send is recorded on the item itself, so running the job twice
// (or restarting the server mid-day) can never email anyone twice.
import { Invoice, Proposal } from '../models/Billing.js';
import { Lead } from '../models/Lead.js';
import { ClientProject } from '../models/ClientProject.js';
import { Setting, JobState } from '../models/Content.js';
import { sendMail } from '../utils/mailer.js';
import { config } from '../config.js';

const DAY = 86400000;
const startOfDay = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export const daysFrom = (from, to) => Math.round((startOfDay(new Date(to)) - startOfDay(new Date(from))) / DAY);
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const url = (path) => `${config.PUBLIC_URL.replace(/\/$/, '')}${path}`;
const amount = (i) => `${i.currency} ${Number(i.total).toFixed(2)}`;

// In order of severity. A reminder is "applicable" once its condition is true.
const INVOICE_STAGES = [
  ['due_soon', (untilDue) => untilDue >= 0 && untilDue <= 3],
  ['overdue_1', (untilDue) => untilDue <= -3],
  ['overdue_2', (untilDue) => untilDue <= -10],
];

function invoiceMail(kind, inv, who, brand) {
  const link = url(`/portal/invoices/${inv._id}`);
  const base = `Invoice ${inv.number} for ${amount(inv)}`;
  const tail = `You can view, print or pay it here:\n${link}\n\nIf you've already paid, thank you, and please ignore this note.\n\n— ${brand}`;
  if (kind === 'due_soon') return { subject: `Reminder: invoice ${inv.number} is due ${iso(inv.dueDate)}`, text: `Hi ${who},\n\nA friendly reminder that ${base} is due on ${iso(inv.dueDate)}.\n\n${tail}` };
  if (kind === 'overdue_1') return { subject: `Invoice ${inv.number} is overdue`, text: `Hi ${who},\n\n${base} was due on ${iso(inv.dueDate)} and I haven't received payment yet.\n\n${tail}` };
  return { subject: `Second reminder: invoice ${inv.number} is overdue`, text: `Hi ${who},\n\nThis is a second reminder: ${base}, due on ${iso(inv.dueDate)}, is still unpaid. If something is blocking payment, just reply and let me know so we can sort it out.\n\n${tail}` };
}

export async function runDailyJobs({ now = new Date(), send = sendMail, force = false } = {}) {
  const settings = (await Setting.findOne({ key: 'site' }).lean()) || {};
  if (settings.remindersEnabled === false) return { skipped: 'Automatic reminders are turned off in Site settings' };
  const today = iso(now);
  const state = await JobState.findOne({ key: 'daily' });
  if (!force && state?.lastRunDate === today) return { skipped: 'Already ran today' };

  const brand = settings.legalName || settings.brandName || 'Anshu Sharma';
  const summary = { ranAt: now.toISOString(), clientEmails: 0, invoiceReminders: [], milestoneReminders: [], digest: false };

  /* 1) Invoice reminders to clients: at most one email per invoice per run */
  const open = await Invoice.find({ status: 'sent' }).populate('client', 'name email active');
  const overdue = [];
  for (const inv of open) {
    const untilDue = daysFrom(now, inv.dueDate);
    if (untilDue < 0) overdue.push({ inv, days: -untilDue });
    const sent = new Set(inv.reminders.map((r) => r.kind));
    const pending = INVOICE_STAGES.filter(([kind, applies]) => applies(untilDue) && !sent.has(kind));
    if (!pending.length) continue;
    const kind = pending[pending.length - 1][0]; // the most severe applicable stage
    const client = inv.client;
    if (!client?.email || client.active === false) continue;
    const msg = invoiceMail(kind, inv, client.name, brand);
    if (await send({ to: client.email, ...msg })) {
      for (const [k] of pending) inv.reminders.push({ kind: k, at: now }); // lower stages are marked done too, so they never follow
      await inv.save();
      summary.clientEmails += 1;
      summary.invoiceReminders.push({ number: inv.number, kind });
    }
  }

  /* 2) Milestones waiting for the client's approval for 5+ days */
  const projects = await ClientProject.find({ 'milestones.status': 'delivered' }).populate('client', 'name email active');
  const staleApprovals = [];
  for (const p of projects) {
    let changed = false;
    for (const m of p.milestones) {
      if (m.status !== 'delivered' || !m.deliveredAt) continue;
      const waiting = daysFrom(m.deliveredAt, now);
      if (waiting >= 7) staleApprovals.push({ project: p.title, milestone: m.title, days: waiting, client: p.client?.name });
      if (waiting >= 5 && !m.reminderSentAt && p.client?.email && p.client.active !== false) {
        const ok = await send({
          to: p.client.email,
          subject: `Waiting for your review: ${m.title}`,
          text: `Hi ${p.client.name},\n\nThe milestone "${m.title}" on ${p.title} has been ready for your review for ${waiting} days. Please approve it or request changes so we can keep moving:\n${url(`/portal/projects/${p._id}`)}\n\n— ${brand}`,
        });
        if (ok) { m.reminderSentAt = now; changed = true; summary.clientEmails += 1; summary.milestoneReminders.push({ project: p.title, milestone: m.title }); }
      }
    }
    if (changed) await p.save();
  }

  /* 3) One daily summary to the owner, only if something needs attention */
  const [quietLeads, quietProposals] = await Promise.all([
    Lead.find({ status: 'new', createdAt: { $lte: new Date(now - 2 * DAY) } }).sort({ createdAt: 1 }).lean(),
    Proposal.find({ status: 'sent', sentAt: { $lte: new Date(now - 5 * DAY) } }).populate('client', 'name').lean(),
  ]);
  const lines = [];
  if (quietLeads.length) lines.push('LEADS WAITING FOR A REPLY (2+ days)', ...quietLeads.map((l) => `  • ${l.name} <${l.email}>: ${daysFrom(l.createdAt, now)} days${l.company ? ` (${l.company})` : ''}`), '');
  if (quietProposals.length) lines.push('PROPOSALS WITHOUT A REPLY (5+ days)', ...quietProposals.map((p) => `  • ${p.title} (${p.client?.name || 'client'}): sent ${daysFrom(p.sentAt, now)} days ago`), '');
  if (overdue.length) lines.push('OVERDUE INVOICES', ...overdue.map(({ inv, days }) => `  • ${inv.number} ${amount(inv)} from ${inv.client?.name || 'client'}: ${days} days overdue`), '');
  if (staleApprovals.length) lines.push('MILESTONES AWAITING CLIENT APPROVAL (7+ days)', ...staleApprovals.map((a) => `  • ${a.project} / ${a.milestone} (${a.client}): ${a.days} days`), '');
  summary.counts = { quietLeads: quietLeads.length, quietProposals: quietProposals.length, overdueInvoices: overdue.length, staleApprovals: staleApprovals.length };
  const owner = config.OWNER_EMAIL || settings.email;
  if (lines.length && owner) {
    summary.digest = await send({ to: owner, subject: `Daily summary: ${iso(now)}`, text: `Things that need your attention:\n\n${lines.join('\n')}\nOpen your admin: ${url('/admin')}\n` });
  }

  await JobState.findOneAndUpdate({ key: 'daily' }, { lastRunDate: today, lastRunAt: now, lastSummary: summary }, { upsert: true });
  return summary;
}
