"use client";

import React, { useRef, useState, useEffect } from 'react';
import QRCodeLib from 'qrcode';
import { cleanLocation } from '@/lib/events/cleanLocation';

export interface TicketData {
  event: any;
  attendee: any;
  registration: any;
  walkathonParticipant?: any;
  qrImage?: string; // If rawToken isn't available, but we prefer rendering dynamically
  rawToken?: string;
  distanceCategory?: any; // The joined distance category object
  /** The ticket tier the attendee picked, e.g. "General Admission" */
  ticketName?: string;
}

interface TicketTemplateProps {
  data: TicketData;
  className?: string;
  /** Brand colour for the ticket header (the event website's primary colour). Hex only. */
  accent?: string;
  /** Colour behind the ticket, used for the perforation notches so they look cut out. */
  backdrop?: string;
}

/*
 * The ticket uses inline hex colours so the on-screen ticket, the printed one and the downloaded PNG
 * (drawn by `drawTicket` below with the same colours and measurements) all match.
 */
const INK = '#16151A';
const MUTED = '#6B6874';
const LINE = '#E7E4EC';
const PAPER = '#FFFFFF';

function isHex(value?: string) {
  return !!value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Mixes a hex colour with white (amount 0–1 of white), for the pale ticket-type panel. */
function tint(hex: string, amount: number) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) + (255 - ((n >> shift) & 255)) * amount);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

/* Ticket-type panel: label line, then the tier name in bold brand colour. Shared by screen and PNG. */
const TIER = { marginTop: 14, padY: 10, padX: 12, bar: 4, labelH: 14, gap: 2, lineH: 20, size: 15 };

function formatDate(date?: string | null) {
  if (!date) return '';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(time?: string | null) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

interface DrawTicketInput {
  fontFamily: string;
  brand: string;
  notch: string;
  type: string;
  ticketName: string;
  eventName: string;
  dateLine: string;
  timeLine: string;
  venue: string;
  monthShort: string;
  dayNum: string;
  distance: string;
  qr: HTMLImageElement;
  registrationNumber: string;
  fullName: string;
  email: string;
}

/** Splits text into lines no wider than `max`, breaking long words (emails, IDs) if needed. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= max) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    let rest = word;
    while (ctx.measureText(rest).width > max && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && ctx.measureText(rest.slice(0, cut)).width > max) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/**
 * Draws the ticket as a PNG-ready canvas, mirroring the on-screen layout (340px card inside a 12px
 * frame). Sizes are in CSS pixels and scaled up for a sharp image.
 */
function drawTicket(t: DrawTicketInput): HTMLCanvasElement {
  const SCALE = 3;
  const FRAME = 12;
  const CARD_W = 340;
  const PAD = 22;
  const INNER = CARD_W - PAD * 2;
  const W = CARD_W + FRAME * 2;
  const font = (weight: number, size: number, family = t.fontFamily) => `${weight} ${size}px ${family}`;
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  // Measure first, so the canvas can be sized to the content.
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = font(800, 22);
  const nameLines = wrapText(probe, t.eventName, INNER);
  probe.font = font(800, TIER.size);
  const tierLines = t.ticketName ? wrapText(probe, t.ticketName, INNER - TIER.bar - TIER.padX * 2) : [];
  const tierH = tierLines.length ? TIER.marginTop + TIER.padY * 2 + TIER.labelH + TIER.gap + TIER.lineH * tierLines.length : 0;
  probe.font = font(400, 13);
  const venueLines = wrapText(probe, t.venue, INNER - 62 - 14);
  probe.font = font(800, 17);
  const personLines = wrapText(probe, t.fullName.replace(/\b\p{L}/gu, (c) => c.toUpperCase()), INNER);
  probe.font = font(400, 12);
  const emailLines = t.email ? wrapText(probe, t.email, INNER) : [];
  probe.font = font(600, 12);
  const footerLines = wrapText(probe, 'Admit one · Show this QR code at the entrance', INNER);

  const detailsH = 20 + 3 + 18 + 3 + 18 * venueLines.length;
  const dateRowH = Math.max(detailsH, 60);
  const cardH =
    6 + 16 + 16 + // accent bar, brand row
    8 + 28 * nameLines.length +
    tierH +
    18 + dateRowH + 18 +
    (t.distance ? 38 + 16 : 0) +
    20 + // tear line
    18 + 190 + 10 + 18 + 6 + // QR block and registration number
    14 + 22 * personLines.length + (emailLines.length ? 2 + 16 * emailLines.length : 0) + 18 +
    11 * 2 + 16 * footerLines.length;
  const H = cardH + FRAME * 2;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'middle';

  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const text = (s: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left', spacing = 0) => {
    ctx.font = f;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
    ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  };

  // Frame and card
  ctx.fillStyle = t.notch;
  ctx.fillRect(0, 0, W, H);
  const cx = FRAME;
  const cy = FRAME;
  ctx.save();
  roundRect(cx, cy, CARD_W, cardH, 18);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.clip();

  let y = cy;
  ctx.fillStyle = t.brand;
  ctx.fillRect(cx, y, CARD_W, 6);
  y += 6 + 16;

  // Brand row
  text(t.type.toUpperCase(), cx + PAD, y + 8, font(700, 11), MUTED, 'left', 1.1);
  y += 16 + 8;

  // Event name
  for (const line of nameLines) {
    text(line, cx + PAD, y + 14, font(800, 22), INK);
    y += 28;
  }

  // Ticket type, on its own highlighted panel so it can't collide with anything
  if (tierLines.length) {
    y += TIER.marginTop;
    const boxH = tierH - TIER.marginTop;
    ctx.save();
    roundRect(cx + PAD, y, INNER, boxH, 10);
    ctx.fillStyle = tint(t.brand, 0.9);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = t.brand;
    ctx.fillRect(cx + PAD, y, TIER.bar, boxH);
    ctx.restore();
    const tx = cx + PAD + TIER.bar + TIER.padX;
    let ty = y + TIER.padY;
    text('TICKET TYPE', tx, ty + TIER.labelH / 2, font(700, 10), MUTED, 'left', 1);
    ty += TIER.labelH + TIER.gap;
    for (const line of tierLines) {
      text(line, tx, ty + TIER.lineH / 2, font(800, TIER.size), t.brand);
      ty += TIER.lineH;
    }
    y += boxH;
  }
  y += 18;

  // Date block
  roundRect(cx + PAD, y, 62, dateRowH, 12);
  ctx.fillStyle = t.brand;
  ctx.fill();
  const blockTop = y + (dateRowH - 44) / 2;
  ctx.globalAlpha = 0.85;
  text(t.monthShort.toUpperCase(), cx + PAD + 31, blockTop + 7, font(700, 11), '#FFFFFF', 'center', 1.1);
  ctx.globalAlpha = 1;
  text(t.dayNum, cx + PAD + 31, blockTop + 14 + 15, font(800, 26), '#FFFFFF', 'center');

  const dx = cx + PAD + 62 + 14;
  let dy = y + (dateRowH - detailsH) / 2;
  text(t.dateLine, dx, dy + 10, font(700, 14), INK);
  dy += 20 + 3;
  text(t.timeLine, dx, dy + 9, font(400, 13), MUTED);
  dy += 18 + 3;
  for (const line of venueLines) {
    text(line, dx, dy + 9, font(400, 13), MUTED);
    dy += 18;
  }
  y += dateRowH + 18;

  if (t.distance) {
    roundRect(cx + PAD, y, INNER, 38, 10);
    ctx.fillStyle = '#F6F5F9';
    ctx.fill();
    ctx.font = font(400, 13);
    const label = 'Distance ';
    text(label, cx + PAD + 12, y + 19, font(400, 13), MUTED);
    text(t.distance, cx + PAD + 12 + ctx.measureText(label).width, y + 19, font(700, 13), INK);
    y += 38 + 16;
  }

  // Tear line with notches
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 18, y + 10);
  ctx.lineTo(cx + CARD_W - 18, y + 10);
  ctx.stroke();
  ctx.restore();
  for (const nx of [cx - 1, cx + CARD_W + 1]) {
    ctx.beginPath();
    ctx.arc(nx, y + 10, 10, 0, Math.PI * 2);
    ctx.fillStyle = t.notch;
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  y += 20 + 18;

  // QR code
  const qx = cx + (CARD_W - 190) / 2;
  roundRect(qx + 0.5, y + 0.5, 189, 189, 14);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(t.qr, qx + 11, y + 11, 168, 168);
  ctx.imageSmoothingEnabled = true;
  y += 190 + 10;
  text(t.registrationNumber, cx + CARD_W / 2, y + 9, font(700, 13, MONO), INK, 'center', 0.5);
  y += 18 + 6 + 14;

  // Attendee
  for (const line of personLines) {
    text(line, cx + CARD_W / 2, y + 11, font(800, 17), INK, 'center');
    y += 22;
  }
  if (emailLines.length) {
    y += 2;
    for (const line of emailLines) {
      text(line, cx + CARD_W / 2, y + 8, font(400, 12), MUTED, 'center');
      y += 16;
    }
  }
  y += 18;

  // Footer
  ctx.fillStyle = t.brand;
  ctx.fillRect(cx, y, CARD_W, cardH - (y - cy));
  y += 11;
  for (const line of footerLines) {
    text(line, cx + CARD_W / 2, y + 8, font(600, 12), '#FFFFFF', 'center');
    y += 16;
  }
  ctx.restore();

  // Card border on top of everything
  roundRect(cx + 0.5, cy + 0.5, CARD_W - 1, cardH - 1, 18);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  return canvas;
}

export function TicketTemplate({ data, className = '', accent, backdrop = '#F5F4F7' }: TicketTemplateProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const qrImgRef = useRef<HTMLImageElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { event, attendee, registration, rawToken, distanceCategory, ticketName } = data;
  const brand = isHex(accent) ? accent!.trim() : '#5A3DE0';
  const notch = isHex(backdrop) ? backdrop : '#F5F4F7';

  useEffect(() => {
    if (rawToken) {
      QRCodeLib.toDataURL(rawToken, { width: 280, margin: 0, errorCorrectionLevel: 'H', color: { dark: INK, light: '#FFFFFF' } })
        .then((url) => setQrDataUrl(url))
        .catch((err) => {
          console.error('Failed to generate QR:', err);
          setDownloadError('QR code generation failed.');
        });
    }
  }, [rawToken]);

  const isWalkathon = event?.type === 'Walkathon';
  const fullName =
    attendee.full_name || `${attendee.firstName || attendee.first_name || ''} ${attendee.lastName || attendee.last_name || ''}`.trim();

  // Registration pages pass the event row (start_date, start_time, location); older callers passed date/venue.
  const startDate = event?.start_date || event?.startDate || event?.date;
  const endDate = event?.end_date || event?.endDate;
  const dateLabel = formatDate(startDate) || 'Date to be announced';
  const endLabel = endDate && endDate !== startDate ? formatDate(endDate) : '';
  const timeLabel = [formatTime(event?.start_time || event?.startTime), formatTime(event?.end_time || event?.endTime)].filter(Boolean).join(' – ');
  const venue =
    cleanLocation(event?.location || event?.venue) || (event?.format === 'Virtual' ? 'Online' : 'Venue to be announced');
  const startObj = startDate ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(startDate) ? `${startDate}T00:00:00` : startDate) : null;
  const validStart = startObj && !Number.isNaN(startObj.getTime());
  const monthShort = validStart ? startObj!.toLocaleDateString('en-IN', { month: 'short' }) : 'TBA';
  const dayNum = validStart ? String(startObj!.getDate()) : '–';
  const registrationNumber = registration?.registrationNumber || registration?.registration_number || 'PENDING';

  const handleDownload = async () => {
    const qrImg = qrImgRef.current;
    if (!ticketRef.current || isDownloading || !qrLoaded || !qrImg) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await document.fonts.ready;
      // Drawn straight onto a canvas rather than screenshotting the page: page-capture libraries
      // drop the QR image on some phones (iOS Safari, in-app browsers), and a ticket without it is useless.
      const canvas = drawTicket({
        fontFamily: getComputedStyle(ticketRef.current).fontFamily || 'sans-serif',
        brand,
        notch,
        type: event?.type || 'Event',
        ticketName: ticketName || '',
        eventName: event?.name || 'Event ticket',
        dateLine: endLabel ? `${dateLabel} – ${endLabel}` : dateLabel,
        timeLine: timeLabel ? `${timeLabel}${event?.timezone === 'Asia/Kolkata' ? ' IST' : ''}` : 'Time to be announced',
        venue,
        monthShort,
        dayNum,
        distance: isWalkathon && distanceCategory?.name ? String(distanceCategory.name) : '',
        qr: qrImg,
        registrationNumber,
        fullName,
        email: attendee.email || '',
      });
      const dataUrl = canvas.toDataURL('image/png');
      if (!dataUrl || !dataUrl.startsWith('data:image/')) throw new Error('Ticket image generation failed.');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Ticket-${registrationNumber}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download ticket:', error);
      setDownloadError('The ticket image could not be created. Use Print / Save as PDF instead.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`flex w-full flex-col items-center ${className}`}>
      {/* On-screen and printed ticket. Keep `drawTicket` in step with layout changes here. */}
      <div ref={ticketRef} style={{ padding: 12, backgroundColor: notch }} className="print:p-0">
        <div
          style={{
            width: 340,
            maxWidth: '100%',
            backgroundColor: PAPER,
            color: INK,
            borderRadius: 18,
            overflow: 'hidden',
            border: `1px solid ${LINE}`,
            boxShadow: '0 16px 36px -18px rgba(22,21,26,0.35)',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <div style={{ height: 6, background: brand }} />

          {/* Brand row */}
          <div style={{ padding: '16px 22px 0', fontSize: 11, lineHeight: '16px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
            {event?.type || 'Event'}
          </div>

          {/* Event name */}
          <h2 style={{ margin: 0, padding: '8px 22px 0', fontSize: 22, lineHeight: '28px', fontWeight: 800, color: INK, wordBreak: 'break-word' }}>
            {event?.name || 'Event ticket'}
          </h2>

          {/* Ticket type */}
          {ticketName && (
            <div
              style={{
                margin: `${TIER.marginTop}px 22px 0`,
                padding: `${TIER.padY}px ${TIER.padX}px ${TIER.padY}px ${TIER.padX + TIER.bar}px`,
                borderRadius: 10,
                background: `linear-gradient(to right, ${brand} ${TIER.bar}px, ${tint(brand, 0.9)} ${TIER.bar}px)`,
              }}
            >
              <div style={{ fontSize: 10, lineHeight: `${TIER.labelH}px`, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>
                Ticket type
              </div>
              <div style={{ marginTop: TIER.gap, fontSize: TIER.size, lineHeight: `${TIER.lineH}px`, fontWeight: 800, color: brand, wordBreak: 'break-word' }}>
                {ticketName}
              </div>
            </div>
          )}

          {/* Date block and details */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'stretch', padding: '18px 22px' }}>
            <div style={{ width: 62, flexShrink: 0, borderRadius: 12, background: brand, color: '#FFFFFF', textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 11, lineHeight: '14px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>{monthShort}</div>
              <div style={{ fontSize: 26, lineHeight: '30px', fontWeight: 800 }}>{dayNum}</div>
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
              <div style={{ fontSize: 14, lineHeight: '20px', fontWeight: 700, color: INK }}>{endLabel ? `${dateLabel} – ${endLabel}` : dateLabel}</div>
              <div style={{ fontSize: 13, lineHeight: '18px', color: MUTED }}>{timeLabel ? `${timeLabel}${event?.timezone === 'Asia/Kolkata' ? ' IST' : ''}` : 'Time to be announced'}</div>
              <div style={{ fontSize: 13, lineHeight: '18px', color: MUTED, wordBreak: 'break-word' }}>{venue}</div>
            </div>
          </div>

          {isWalkathon && distanceCategory && (
            <div style={{ margin: '0 22px 16px', padding: '10px 12px', borderRadius: 10, background: '#F6F5F9', fontSize: 13, lineHeight: '18px' }}>
              <span style={{ color: MUTED }}>Distance </span>
              <strong style={{ color: INK }}>{distanceCategory.name}</strong>
            </div>
          )}

          {/* Tear line */}
          <div style={{ position: 'relative', height: 20 }} aria-hidden="true">
            <div style={{ position: 'absolute', left: -11, top: 0, width: 20, height: 20, borderRadius: '50%', background: notch, borderRight: `1px solid ${LINE}` }} />
            <div style={{ position: 'absolute', right: -11, top: 0, width: 20, height: 20, borderRadius: '50%', background: notch, borderLeft: `1px solid ${LINE}` }} />
            <div style={{ position: 'absolute', left: 18, right: 18, top: 9, borderTop: `2px dashed ${LINE}` }} />
          </div>

          {/* QR */}
          <div style={{ padding: '18px 22px 6px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', padding: 10, borderRadius: 14, background: '#FFFFFF', border: `1px solid ${LINE}` }}>
              {rawToken && qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  // A data URL can finish loading before React attaches onLoad, so also check on mount.
                  ref={(img) => {
                    qrImgRef.current = img;
                    if (img?.complete && img.naturalWidth > 0) setQrLoaded(true);
                  }}
                  src={qrDataUrl}
                  width={168}
                  height={168}
                  alt="Entry QR code"
                  onLoad={() => setQrLoaded(true)}
                  style={{ display: 'block' }}
                />
              ) : (
                <div style={{ width: 168, height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
                  <span className={`material-symbols-outlined text-[28px] ${rawToken ? 'animate-spin' : ''}`}>{rawToken ? 'progress_activity' : 'qr_code_2'}</span>
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: '18px', fontWeight: 700, letterSpacing: '0.04em', color: INK, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>
              {registrationNumber}
            </div>
          </div>

          {/* Attendee */}
          <div style={{ padding: '14px 22px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, lineHeight: '22px', fontWeight: 800, color: INK, textTransform: 'capitalize', wordBreak: 'break-word' }}>{fullName}</div>
            {attendee.email && (
              <div style={{ marginTop: 2, fontSize: 12, lineHeight: '16px', color: MUTED, overflowWrap: 'anywhere' }}>{attendee.email}</div>
            )}
          </div>

          {/* Footer */}
          <div style={{ background: brand, color: '#FFFFFF', textAlign: 'center', padding: '11px 22px', fontSize: 12, lineHeight: '16px', fontWeight: 600 }}>
            Admit one · Show this QR code at the entrance
          </div>
        </div>
      </div>

      {downloadError && (
        <p role="alert" className="mt-3 max-w-[360px] rounded-lg bg-red-50 px-3 py-2 text-center text-[13px] text-red-700 print:hidden">
          {downloadError}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex w-full max-w-[384px] flex-col gap-2.5 px-3 sm:flex-row print:hidden">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading || !rawToken || !qrLoaded}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--website-button-radius,12px)] px-4 text-[14px] font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
          style={{ backgroundColor: brand }}
        >
          <span className={`material-symbols-outlined text-[19px] ${isDownloading ? 'animate-spin' : ''}`} aria-hidden="true">
            {isDownloading ? 'progress_activity' : 'download'}
          </span>
          {isDownloading ? 'Preparing…' : 'Download ticket'}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!rawToken || !qrLoaded}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--website-button-radius,12px)] border px-4 text-[14px] font-semibold transition hover:bg-black/[0.03] active:scale-[0.99] disabled:opacity-60"
          style={{ borderColor: LINE, color: INK, backgroundColor: '#FFFFFF' }}
        >
          <span className="material-symbols-outlined text-[19px]" aria-hidden="true">print</span>
          <span className="whitespace-nowrap">Print / PDF</span>
        </button>
      </div>
    </div>
  );
}
