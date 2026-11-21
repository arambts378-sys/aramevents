'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Event } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { StatCard } from '@/components/ui';

type TicketRow = {
  id: string;
  eventId: string;
  eventName: string;
  name: string;
  ticketType: 'free' | 'paid';
  pricePaise: number;
  quantityTotal: number;
  sold: number;
  salesPaise: number;
};

type Sales = {
  rows: TicketRow[];
  ticketsSold: number;
  ticketSalesPaise: number;
  /** Sponsorship and partnership value before GST */
  sponsorPaise: number;
  /** GST collected on sponsorships, owed to the government, so not revenue */
  gstPaise: number;
};

const inr = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: paise % 100 === 0 ? 0 : 2 }).format(
    paise / 100,
  );

type InvoiceRow = {
  event_id: string;
  source: 'ticket' | 'sponsor' | 'partner';
  amount: number;
  subtotal: number | null;
  registration: { ticket_type_id: string | null } | { ticket_type_id: string | null }[] | null;
};

/**
 * Ticket sales on the home page: for each event with registrations, every ticket type with its
 * price, how many are sold and the money collected, plus workspace totals. Sold counts come
 * from registrations (as on the Tickets page); money comes from invoices, which are issued for
 * every completed online payment.
 */
export function TicketSalesOverview({ events }: { events: Event[] }) {
  const [sales, setSales] = useState<Sales | null>(null);
  const eventKey = events.map((e) => e.id).join(',');

  useEffect(() => {
    let alive = true;
    const ids = eventKey ? eventKey.split(',') : [];
    if (ids.length === 0) return;
    const names = new Map(events.map((e) => [e.id, e.name]));

    (async () => {
      const supabase = createClient();
      const [ticketsRes, regsRes, invoicesRes] = await Promise.all([
        supabase
          .from('event_ticket_types')
          .select('id, event_id, name, ticket_type, price_amount, quantity_total, created_at')
          .in('event_id', ids)
          .order('created_at', { ascending: true }),
        supabase
          .from('registrations')
          .select('event_id, ticket_type_id')
          .in('event_id', ids)
          .in('status', ['pending', 'confirmed']),
        supabase
          .from('payment_invoices')
          .select('event_id, source, amount, subtotal, registration:registrations(ticket_type_id)')
          .in('event_id', ids),
      ]);
      if (!alive) return;

      const regs = regsRes.data ?? [];
      const soldByType = new Map<string, number>();
      const eventsWithRegistrations = new Set<string>();
      for (const r of regs) {
        eventsWithRegistrations.add(r.event_id);
        if (r.ticket_type_id) soldByType.set(r.ticket_type_id, (soldByType.get(r.ticket_type_id) ?? 0) + 1);
      }

      // Without permission to read invoices (viewers), money shows as nothing collected.
      const invoices = (invoicesRes.data ?? []) as unknown as InvoiceRow[];
      const salesByType = new Map<string, number>();
      let ticketSalesPaise = 0;
      let sponsorPaise = 0;
      let gstPaise = 0;
      for (const inv of invoices) {
        const amount = Number(inv.amount) || 0;
        if (inv.source === 'ticket') {
          ticketSalesPaise += amount;
          const reg = Array.isArray(inv.registration) ? inv.registration[0] : inv.registration;
          if (reg?.ticket_type_id) salesByType.set(reg.ticket_type_id, (salesByType.get(reg.ticket_type_id) ?? 0) + amount);
        } else {
          const base = inv.subtotal != null ? Number(inv.subtotal) : amount;
          sponsorPaise += base;
          gstPaise += amount - base;
        }
      }

      // Only events where registration has happened.
      const rows: TicketRow[] = (ticketsRes.data ?? [])
        .filter((t) => eventsWithRegistrations.has(t.event_id))
        .map((t) => ({
          id: t.id,
          eventId: t.event_id,
          eventName: names.get(t.event_id) ?? 'Event',
          name: t.name,
          ticketType: t.ticket_type,
          pricePaise: Number(t.price_amount) || 0,
          quantityTotal: Number(t.quantity_total) || 0,
          sold: soldByType.get(t.id) ?? 0,
          salesPaise: salesByType.get(t.id) ?? 0,
        }));

      setSales({
        rows,
        ticketsSold: rows.reduce((sum, r) => sum + r.sold, 0),
        ticketSalesPaise,
        sponsorPaise,
        gstPaise,
      });
    })().catch((err) => console.error('Failed to load ticket sales:', err));

    return () => {
      alive = false;
    };
    // eventKey stands in for events: refetch only when the set of events changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey]);

  // Nothing to show until an event has registrations.
  if (events.length === 0 || !sales || (sales.rows.length === 0 && sales.ticketSalesPaise === 0 && sales.sponsorPaise === 0)) return null;

  const totalRevenue = sales.ticketSalesPaise + sales.sponsorPaise;
  const multipleEvents = new Set(sales.rows.map((r) => r.eventId)).size > 1;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="ticket-sales-title">
      <div>
        <h2 id="ticket-sales-title" className="text-[20px] font-bold text-ds-ink font-space">
          Ticket sales &amp; revenue
        </h2>
        <p className="text-[13px] text-ds-muted">Ticket types, sales and money collected online.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Tickets sold"
          value={sales.ticketsSold.toLocaleString('en-IN')}
          hint={`${sales.rows.length} ticket type${sales.rows.length === 1 ? '' : 's'}`}
          icon="confirmation_number"
          tone="accent"
        />
        <StatCard label="Ticket sales" value={inr(sales.ticketSalesPaise)} hint="Paid tickets, collected online" icon="sell" tone="success" />
        <StatCard
          label="Sponsors & partners"
          value={inr(sales.sponsorPaise)}
          hint={sales.gstPaise > 0 ? `Before GST (+${inr(sales.gstPaise)} GST)` : 'Before GST'}
          icon="handshake"
          tone="indigo"
        />
        <StatCard label="Total revenue" value={inr(totalRevenue)} hint="Tickets + sponsorships, excluding GST" icon="payments" tone="warning" />
      </div>

      {sales.rows.length > 0 && (
        <div className="ds-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-ds-line text-[11px] font-bold uppercase tracking-wider text-ds-muted">
                  <th className="px-5 py-3">Ticket type</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3">Sold</th>
                  <th className="px-5 py-3 text-right">Sales amount</th>
                </tr>
              </thead>
              <tbody>
                {sales.rows.map((r) => {
                  const pct = r.quantityTotal > 0 ? Math.min(100, Math.round((r.sold / r.quantityTotal) * 100)) : 0;
                  return (
                    <tr key={r.id} className="border-b border-ds-line last:border-0">
                      <td className="px-5 py-3.5">
                        <Link href={`/app/events/${r.eventId}/tickets`} className="font-semibold text-ds-ink hover:text-ds-accent">
                          {r.name}
                        </Link>
                        {multipleEvents && <span className="block text-[12px] text-ds-muted">{r.eventName}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right text-ds-ink">{r.ticketType === 'free' ? 'Free' : inr(r.pricePaise)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="whitespace-nowrap text-ds-ink">
                            <span className="font-semibold">{r.sold.toLocaleString('en-IN')}</span>
                            <span className="text-ds-muted"> / {r.quantityTotal.toLocaleString('en-IN')}</span>
                          </span>
                          <span className="hidden sm:block h-1.5 w-24 rounded-full bg-ds-line overflow-hidden" aria-hidden="true">
                            <span className="block h-full rounded-full bg-ds-accent" style={{ width: `${pct}%` }} />
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-ds-ink">
                        {r.ticketType === 'free' ? <span className="font-normal text-ds-muted">—</span> : inr(r.salesPaise)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-ds-line bg-ds-subtle/60 font-semibold text-ds-ink">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3">{sales.ticketsSold.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-right">{inr(sales.ticketSalesPaise)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
