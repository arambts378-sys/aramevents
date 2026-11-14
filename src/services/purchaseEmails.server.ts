import 'server-only';
import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_URL, SUPPORT_EMAIL } from '@/lib/site';
import { formatPaiseToINR } from '@/services/ticketService';
import { sendTransactionalEmail } from '@/services/organizerMailer';

/*
 * Emails sent after someone books: attendees get their ticket (QR code) and, when they paid, a link
 * to their invoice; sponsors and partners get a confirmation and, when they paid, their invoice.
 * Sent to the address typed on the form, through Aram's own mail route (Zoho), so they work for
 * every event without the organizer setting up email first.
 */

const BRAND = '#7A1F3D';
const INK = '#17152B';
const MUTED = '#5B5870';
const LINE = '#E4E2EC';

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Absolute link for emails (invoice pages are opened outside the site). */
function absolute(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || SITE_URL).replace(/\/+$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

function eventWhen(event: { start_date?: string | null; start_time?: string | null; end_time?: string | null }) {
  if (!event.start_date) return 'Date to be announced';
  const date = new Date(`${event.start_date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = (t?: string | null) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const d = new Date(2000, 0, 1, h, m || 0);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  };
  const span = [time(event.start_time), time(event.end_time)].filter(Boolean).join(' – ');
  return span ? `${date}, ${span}` : date;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;color:${MUTED};font-size:13px;width:140px;vertical-align:top">${esc(label)}</td>
    <td style="padding:6px 0;color:${INK};font-size:14px;font-weight:600">${value}</td>
  </tr>`;
}

function button(href: string, label: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px">${esc(label)}</a>`;
}

function layout(opts: { eyebrow: string; title: string; intro: string; body: string; footer: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F4F3F7;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3F7;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden">
        <tr><td style="background:${BRAND};padding:22px 28px;color:#ffffff">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.85">${esc(opts.eyebrow)}</div>
          <div style="font-size:22px;font-weight:800;margin-top:4px">${esc(opts.title)}</div>
        </td></tr>
        <tr><td style="padding:24px 28px 8px;color:${INK};font-size:15px;line-height:1.55">${opts.intro}</td></tr>
        <tr><td style="padding:8px 28px 24px">${opts.body}</td></tr>
        <tr><td style="padding:16px 28px 22px;border-top:1px solid ${LINE};color:${MUTED};font-size:12px;line-height:1.5">${opts.footer}</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

/* ───────────── Tickets ───────────── */

export interface TicketEmailData {
  to: string;
  firstName: string;
  attendeeName: string;
  eventName: string;
  when: string;
  venue: string | null;
  registrationNumber: string;
  ticketName: string | null;
  /** True when a QR image is attached (cid:ticket-qr) */
  hasQr: boolean;
  invoice: { number: string; total: string; url: string } | null;
}

export function buildTicketEmail(d: TicketEmailData) {
  const subject = `Your ticket for ${d.eventName}${d.invoice ? ' and invoice' : ''}`;
  const details = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row('Attendee', esc(d.attendeeName))}
    ${d.ticketName ? row('Ticket', esc(d.ticketName)) : ''}
    ${row('Registration no.', `<span style="font-family:monospace">${esc(d.registrationNumber)}</span>`)}
    ${row('When', esc(d.when))}
    ${d.venue ? row('Where', esc(d.venue)) : ''}
    ${d.invoice ? row('Amount paid', esc(d.invoice.total)) : ''}
  </table>`;
  const qr = d.hasQr
    ? `<div style="text-align:center;margin:20px 0 8px">
        <div style="display:inline-block;padding:12px;border:1px solid ${LINE};border-radius:14px;background:#ffffff">
          <img src="cid:ticket-qr" width="200" height="200" alt="Ticket QR code ${esc(d.registrationNumber)}" style="display:block">
        </div>
        <div style="color:${MUTED};font-size:12px;margin-top:8px">Show this QR code at the entrance. It is also attached to this email.</div>
      </div>`
    : `<p style="color:${MUTED};font-size:13px">Your QR code could not be attached. Show your registration number at the entrance, or contact the organizer.</p>`;
  const invoice = d.invoice
    ? `<div style="margin-top:20px;padding:16px;border:1px solid ${LINE};border-radius:12px;background:#FAFAFC">
        <div style="font-size:14px;color:${INK};font-weight:700">Invoice ${esc(d.invoice.number)} · ${esc(d.invoice.total)}</div>
        <div style="font-size:13px;color:${MUTED};margin:4px 0 12px">View it online and download or print it as a PDF.</div>
        ${button(d.invoice.url, 'View and download invoice')}
      </div>`
    : '';

  const html = layout({
    eyebrow: d.eventName,
    title: "You're registered!",
    intro: `<p style="margin:0">Hi ${esc(d.firstName)}, your registration for <strong>${esc(d.eventName)}</strong> is confirmed.</p>`,
    body: details + qr + invoice,
    footer: `Keep this email: the QR code is your entry pass. Don't share it, since it can only be used once at each entry point.<br>Questions? Reply to this email or write to ${esc(SUPPORT_EMAIL)}.`,
  });

  const text = [
    `Hi ${d.firstName},`,
    '',
    `Your registration for ${d.eventName} is confirmed.`,
    '',
    `Attendee: ${d.attendeeName}`,
    d.ticketName ? `Ticket: ${d.ticketName}` : null,
    `Registration no.: ${d.registrationNumber}`,
    `When: ${d.when}`,
    d.venue ? `Where: ${d.venue}` : null,
    d.invoice ? `Amount paid: ${d.invoice.total}` : null,
    '',
    d.hasQr ? 'Your ticket QR code is attached. Show it at the entrance.' : 'Show your registration number at the entrance.',
    d.invoice ? `\nInvoice ${d.invoice.number}: ${d.invoice.url}` : null,
    '',
    `Questions? Write to ${SUPPORT_EMAIL}.`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { subject, html, text };
}

/**
 * Emails an attendee their ticket. `qrToken` is the raw ticket token (rendered as the QR image);
 * `invoiceUrl` is set for paid tickets. Never throws: returns whether it was sent.
 */
export async function sendTicketEmail(input: {
  eventId: string;
  registrationId: string;
  qrToken?: string;
  invoiceUrl?: string | null;
}): Promise<boolean> {
  try {
    const db = createAdminClient();
    const [{ data: reg }, { data: event }] = await Promise.all([
      db.from('registrations').select('registration_number, metadata, person_id').eq('id', input.registrationId).maybeSingle(),
      db.from('events').select('name, start_date, start_time, end_time, location').eq('id', input.eventId).maybeSingle(),
    ]);
    if (!reg || !event) return false;
    const { data: person } = await db.from('people').select('first_name, last_name, email').eq('id', reg.person_id).maybeSingle();
    if (!person?.email) return false;

    let invoice: TicketEmailData['invoice'] = null;
    if (input.invoiceUrl) {
      const { data: inv } = await db
        .from('payment_invoices')
        .select('invoice_number, amount')
        .eq('registration_id', input.registrationId)
        .maybeSingle();
      if (inv) invoice = { number: inv.invoice_number, total: formatPaiseToINR(Number(inv.amount)), url: absolute(input.invoiceUrl) };
    }

    const qrPng = input.qrToken
      ? (await QRCode.toDataURL(input.qrToken, { errorCorrectionLevel: 'H', margin: 1, width: 400 })).replace(/^data:image\/png;base64,/, '')
      : null;

    const metadata = (reg.metadata ?? {}) as { ticket_type_name?: string };
    const mail = buildTicketEmail({
      to: person.email,
      firstName: person.first_name || 'there',
      attendeeName: [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email,
      eventName: event.name,
      when: eventWhen(event),
      venue: event.location,
      registrationNumber: reg.registration_number,
      ticketName: metadata.ticket_type_name ?? null,
      hasQr: Boolean(qrPng),
      invoice,
    });

    await sendTransactionalEmail({
      to: person.email,
      fromName: event.name,
      replyTo: SUPPORT_EMAIL,
      ...mail,
      ...(qrPng
        ? {
            inlineImages: [{ cid: 'ticket-qr', name: 'ticket-qr.png', mimeType: 'image/png', contentBase64: qrPng }],
            attachments: [{ name: `ticket-${reg.registration_number}.png`, mimeType: 'image/png', contentBase64: qrPng }],
          }
        : {}),
    });
    return true;
  } catch (err) {
    console.error('[emails] ticket email failed', { registration: input.registrationId, message: (err as Error)?.message });
    return false;
  }
}

/* ───────────── Sponsors and partners ───────────── */

export interface SponsorEmailData {
  to: string;
  contactName: string;
  organization: string;
  kind: 'sponsor' | 'partner';
  eventName: string;
  when: string;
  choice: string;
  /** Charged incl. GST, formatted; null when nothing was paid */
  paidTotal: string | null;
  /** Requested amount before payment (unpaid requests), formatted */
  requestedAmount: string | null;
  invoice: { number: string; url: string } | null;
}

export function buildSponsorEmail(d: SponsorEmailData) {
  const label = d.kind === 'partner' ? 'partnership' : 'sponsorship';
  const subject = d.paidTotal
    ? `Payment received: ${label} of ${d.eventName}${d.invoice ? ` (invoice ${d.invoice.number})` : ''}`
    : `We received your ${label} request for ${d.eventName}`;
  const details = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row('Organization', esc(d.organization))}
    ${row(d.kind === 'partner' ? 'Partnership' : 'Sponsorship', esc(d.choice))}
    ${row('Event', esc(d.eventName))}
    ${row('When', esc(d.when))}
    ${d.paidTotal ? row('Amount paid', `${esc(d.paidTotal)} <span style="color:${MUTED};font-weight:400">(incl. GST)</span>`) : ''}
    ${!d.paidTotal && d.requestedAmount ? row('Amount', esc(d.requestedAmount)) : ''}
  </table>`;
  const invoice = d.invoice
    ? `<div style="margin-top:20px;padding:16px;border:1px solid ${LINE};border-radius:12px;background:#FAFAFC">
        <div style="font-size:14px;color:${INK};font-weight:700">Invoice ${esc(d.invoice.number)}</div>
        <div style="font-size:13px;color:${MUTED};margin:4px 0 12px">Your GST invoice. View it online and download or print it as a PDF.</div>
        ${button(d.invoice.url, 'View and download invoice')}
      </div>`
    : '';
  const next = d.paidTotal
    ? 'The organizer will be in touch to confirm the details, such as your logo and benefits.'
    : d.requestedAmount
      ? 'Nothing has been charged. The organizer will review your request and contact you with payment details.'
      : 'The organizer will review your request and get back to you.';

  const html = layout({
    eyebrow: d.eventName,
    title: d.paidTotal ? 'Thank you for your support!' : 'Request received',
    intro: `<p style="margin:0 0 10px">Hi ${esc(d.contactName)},</p><p style="margin:0">${
      d.paidTotal
        ? `We received your payment for the <strong>${esc(d.eventName)}</strong> ${label}.`
        : `Thank you for your interest in a ${label} of <strong>${esc(d.eventName)}</strong>.`
    } ${esc(next)}</p>`,
    body: details + invoice,
    footer: `Questions? Reply to this email or write to ${esc(SUPPORT_EMAIL)}.`,
  });

  const text = [
    `Hi ${d.contactName},`,
    '',
    d.paidTotal
      ? `We received your payment for the ${d.eventName} ${label}.`
      : `Thank you for your interest in a ${label} of ${d.eventName}.`,
    next,
    '',
    `Organization: ${d.organization}`,
    `${d.kind === 'partner' ? 'Partnership' : 'Sponsorship'}: ${d.choice}`,
    `When: ${d.when}`,
    d.paidTotal ? `Amount paid: ${d.paidTotal} (incl. GST)` : d.requestedAmount ? `Amount: ${d.requestedAmount}` : null,
    d.invoice ? `\nInvoice ${d.invoice.number}: ${d.invoice.url}` : null,
    '',
    `Questions? Write to ${SUPPORT_EMAIL}.`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { subject, html, text };
}

/** Emails a sponsor/partner their confirmation, with the invoice when they paid. Never throws. */
export async function sendSponsorEmail(input: {
  eventId: string;
  sponsorId: string;
  /** Amount charged incl. GST (paise), when paid online */
  paidTotal?: number | null;
  invoiceUrl?: string | null;
}): Promise<boolean> {
  try {
    const db = createAdminClient();
    const [{ data: sponsor }, { data: event }] = await Promise.all([
      db.from('event_sponsors').select('kind, name, tier, amount_agreed, contact_name, contact_email').eq('id', input.sponsorId).maybeSingle(),
      db.from('events').select('name, start_date, start_time, end_time').eq('id', input.eventId).maybeSingle(),
    ]);
    if (!sponsor?.contact_email || !event) return false;

    let invoice: SponsorEmailData['invoice'] = null;
    if (input.invoiceUrl) {
      const { data: inv } = await db.from('payment_invoices').select('invoice_number').eq('sponsor_id', input.sponsorId).maybeSingle();
      invoice = { number: inv?.invoice_number ?? '', url: absolute(input.invoiceUrl) };
    }

    const mail = buildSponsorEmail({
      to: sponsor.contact_email,
      contactName: sponsor.contact_name || 'there',
      organization: sponsor.name,
      kind: sponsor.kind === 'partner' ? 'partner' : 'sponsor',
      eventName: event.name,
      when: eventWhen(event),
      choice: sponsor.tier || (sponsor.kind === 'partner' ? 'Partnership' : 'Sponsorship'),
      paidTotal: input.paidTotal ? formatPaiseToINR(input.paidTotal) : null,
      requestedAmount: Number(sponsor.amount_agreed) > 0 ? `${formatPaiseToINR(Number(sponsor.amount_agreed))} + GST` : null,
      invoice,
    });

    await sendTransactionalEmail({ to: sponsor.contact_email, fromName: event.name, replyTo: SUPPORT_EMAIL, ...mail });
    return true;
  } catch (err) {
    console.error('[emails] sponsor email failed', { sponsor: input.sponsorId, message: (err as Error)?.message });
    return false;
  }
}
