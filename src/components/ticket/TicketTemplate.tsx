"use client";

import React, { useRef, useState, useEffect } from 'react';
import QRCodeLib from 'qrcode';
import html2canvas from 'html2canvas';
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
 * The ticket is drawn with inline hex colours on purpose: it is captured to a PNG with html2canvas,
 * which cannot read the colour functions (oklch, color-mix) that Tailwind's palette compiles to.
 */
const INK = '#16151A';
const MUTED = '#6B6874';
const LINE = '#E7E4EC';
const PAPER = '#FFFFFF';

function isHex(value?: string) {
  return !!value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Darkens a hex colour, for the second stop of the header gradient. */
function shade(hex: string, amount: number) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  const ch = (shift: number) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * (1 - amount))));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

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
    if (!ticketRef.current || isDownloading || !qrLoaded) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await document.fonts.ready;
      const scale = 2;
      const canvas = await html2canvas(ticketRef.current, { scale, useCORS: true, backgroundColor: notch, logging: false });

      // html2canvas can leave the QR image blank, so paint it onto the result at the same spot.
      const qrImg = qrImgRef.current;
      const ctx = canvas.getContext('2d');
      if (qrImg && ctx) {
        const box = ticketRef.current.getBoundingClientRect();
        const r = qrImg.getBoundingClientRect();
        // The canvas is not always exactly `scale` times the element (device pixel ratio, zoom), so measure it.
        const k = canvas.width / box.width;
        const [x, y, w, h] = [(r.left - box.left) * k, (r.top - box.top) * k, r.width * k, r.height * k];
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, w, h);
        ctx.drawImage(qrImg, x, y, w, h);
      }
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
      {/* Captured area. Plain blocks only: html2canvas misplaces text in pills and clips ellipses. */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px 0', fontSize: 11, lineHeight: '16px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span style={{ color: MUTED }}>{event?.type || 'Event'}</span>
            <span style={{ color: brand }}>{ticketName || 'Admit one'}</span>
          </div>

          {/* Event name */}
          <h2 style={{ margin: 0, padding: '8px 22px 0', fontSize: 22, lineHeight: '28px', fontWeight: 800, color: INK, wordBreak: 'break-word' }}>
            {event?.name || 'Event ticket'}
          </h2>

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
