'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { 
  ticketService, 
  rupeesToPaise, 
  paiseToRupees, 
  formatPaiseToINR,
  CreateTicketPayload, 
  UpdateTicketPayload 
} from '@/services/ticketService';
import { EventTicketType, TicketType, TicketVisibility, TicketDerivedStatus } from '@/types';

export default function OrganizerTicketsPage() {
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const router = useRouter();
  const { getEvent, currentUser, isHydrated } = useAppContext();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tickets, setTickets] = useState<EventTicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMigrationPending, setIsMigrationPending] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<EventTicketType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion/Deactivation Confirmation Modal State
  const [deleteModalTicket, setDeleteModalTicket] = useState<EventTicketType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ticket Form Fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ticket_type: 'paid' as TicketType,
    price_in_rupees: '499',
    quantity_total: '100',
    sales_start_at: '',
    sales_end_at: '',
    min_per_order: '1',
    max_per_order: '10',
    visibility: 'public' as TicketVisibility,
    is_active: true,
  });

  const event = getEvent(eventId);

  // Load Tickets
  const fetchTickets = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await ticketService.getEventTicketTypes(eventId);
      if (res.isMigrationPending) {
        setIsMigrationPending(true);
      } else {
        setIsMigrationPending(false);
        setTickets(res.tickets);
      }
    } catch (err: any) {
      const category = ticketService.classifyDatabaseError ? ticketService.classifyDatabaseError(err) : 'OTHER';
      if (ticketService.isTableMissingError(err)) {
        setIsMigrationPending(true);
        setError(null);
      } else {
        setIsMigrationPending(false);
        const errorMsg = err?.message || (typeof err === 'object' && Object.keys(err).length > 0 ? JSON.stringify(err) : 'Unable to load tickets for this event.');
        console.error(`Failed to load tickets [${category}]:`, errorMsg);
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && eventId) {
      fetchTickets();
    }
  }, [isHydrated, eventId]);

  // Derived Summary Metrics
  const summary = useMemo(() => {
    return ticketService.getTicketSummaryMetrics(tickets);
  }, [tickets]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (isMigrationPending) {
      setEditingTicket(null);
      setModalOpen(true);
      return;
    }
    setEditingTicket(null);
    setFormData({
      name: '',
      description: '',
      ticket_type: 'free',
      price_in_rupees: '0',
      quantity_total: '100',
      sales_start_at: '',
      sales_end_at: '',
      min_per_order: '1',
      max_per_order: '5',
      visibility: 'public',
      is_active: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (ticket: EventTicketType) => {
    setEditingTicket(ticket);
    const startStr = ticket.sales_start_at ? new Date(ticket.sales_start_at).toISOString().slice(0, 16) : '';
    const endStr = ticket.sales_end_at ? new Date(ticket.sales_end_at).toISOString().slice(0, 16) : '';

    setFormData({
      name: ticket.name,
      description: ticket.description || '',
      ticket_type: ticket.ticket_type,
      price_in_rupees: String(paiseToRupees(ticket.price_amount)),
      quantity_total: String(ticket.quantity_total),
      sales_start_at: startStr,
      sales_end_at: endStr,
      min_per_order: String(ticket.min_per_order || 1),
      max_per_order: String(ticket.max_per_order || 10),
      visibility: ticket.visibility,
      is_active: ticket.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Submit Ticket Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.name.trim()) {
      setFormError('Ticket name is required.');
      return;
    }

    const qty = parseInt(formData.quantity_total, 10);
    if (isNaN(qty) || qty < 1) {
      setFormError('Quantity must be at least 1.');
      return;
    }

    if (formData.ticket_type === 'paid') {
      const priceVal = parseFloat(formData.price_in_rupees);
      if (isNaN(priceVal) || priceVal <= 0) {
        setFormError('Paid tickets must have a price greater than ₹0.');
        return;
      }
    }

    const minQty = parseInt(formData.min_per_order, 10);
    const maxQty = parseInt(formData.max_per_order, 10);
    if (minQty < 1) {
      setFormError('Minimum tickets per order must be at least 1.');
      return;
    }
    if (maxQty < minQty) {
      setFormError('Maximum tickets per order cannot be less than minimum tickets per order.');
      return;
    }

    if (formData.sales_start_at && formData.sales_end_at) {
      if (new Date(formData.sales_end_at) < new Date(formData.sales_start_at)) {
        setFormError('Sales end date cannot be earlier than sales start date.');
        return;
      }
    }

    // When editing: enforce quantity >= sold count
    if (editingTicket && (editingTicket.quantity_sold || 0) > qty) {
      setFormError(`Quantity cannot be lower than tickets already sold (${editingTicket.quantity_sold}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTicket) {
        const payload: UpdateTicketPayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          ticket_type: formData.ticket_type,
          price_in_rupees: formData.ticket_type === 'free' ? 0 : formData.price_in_rupees,
          quantity_total: qty,
          sales_start_at: formData.sales_start_at ? new Date(formData.sales_start_at).toISOString() : null,
          sales_end_at: formData.sales_end_at ? new Date(formData.sales_end_at).toISOString() : null,
          min_per_order: minQty,
          max_per_order: maxQty,
          visibility: formData.visibility,
          is_active: formData.is_active,
        };
        await ticketService.updateTicketType(editingTicket.id, payload);
        setSuccessMessage(`Ticket "${formData.name}" updated successfully.`);
      } else {
        const payload: CreateTicketPayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          ticket_type: formData.ticket_type,
          price_in_rupees: formData.ticket_type === 'free' ? 0 : formData.price_in_rupees,
          quantity_total: qty,
          sales_start_at: formData.sales_start_at ? new Date(formData.sales_start_at).toISOString() : null,
          sales_end_at: formData.sales_end_at ? new Date(formData.sales_end_at).toISOString() : null,
          min_per_order: minQty,
          max_per_order: maxQty,
          visibility: formData.visibility,
          is_active: formData.is_active,
        };
        await ticketService.createTicketType(eventId, payload);
        setSuccessMessage(`Ticket "${formData.name}" created successfully.`);
      }

      setModalOpen(false);
      await fetchTickets();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save ticket type.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Ticket Active Status
  const handleToggleActive = async (ticket: EventTicketType) => {
    try {
      const nextActive = !ticket.is_active;
      await ticketService.updateTicketType(ticket.id, { is_active: nextActive });
      setSuccessMessage(`Ticket "${ticket.name}" marked as ${nextActive ? 'Active' : 'Inactive'}.`);
      await fetchTickets();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to change ticket status.');
    }
  };

  // Confirm Delete / Deactivate
  const handleConfirmDelete = async () => {
    if (!deleteModalTicket) return;
    setIsDeleting(true);
    try {
      const result = await ticketService.deleteOrDeactivateTicketType(deleteModalTicket.id);
      setSuccessMessage(result.message);
      setDeleteModalTicket(null);
      await fetchTickets();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to remove ticket type.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status?: TicketDerivedStatus) => {
    switch (status) {
      case 'on_sale':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            On Sale
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Scheduled
          </span>
        );
      case 'sold_out':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Sold Out
          </span>
        );
      case 'sales_ended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
            Sales Ended
          </span>
        );
      case 'inactive':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ds-accent-soft border border-ds-line text-ds-muted font-mono text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-ds-muted"></span>
            Inactive
          </span>
        );
    }
  };

  // Format Sales Period
  const formatSalesPeriod = (start?: string | null, end?: string | null) => {
    if (!start && !end) return 'Always available';
    const formatDate = (dStr: string) => {
      try {
        const d = new Date(dStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return dStr;
      }
    };
    if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
    if (start) return `Starts: ${formatDate(start)}`;
    if (end) return `Ends: ${formatDate(end)}`;
    return 'Always available';
  };

  // Loading Skeleton
  if (!isHydrated || loading) {
    return (
      <div className="h-full bg-ds-canvas text-ds-ink antialiased min-h-screen w-full">
        <div className="min-h-screen flex flex-row w-full bg-ds-canvas">
          <Sidebar currentUser={currentUser} />
          <main className="flex-1 min-w-0 bg-ds-canvas min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 overflow-y-auto w-full">
            <div className="w-full space-y-8 animate-pulse">
              <div className="h-5 w-32 bg-ds-line rounded-md" />
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <div className="h-10 w-72 bg-ds-line rounded-xl" />
                  <div className="h-4 w-96 bg-ds-line rounded" />
                </div>
                <div className="h-10 w-36 bg-ds-line rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-white border border-ds-line rounded-2xl" />
                ))}
              </div>
              <div className="h-96 bg-white border border-ds-line rounded-2xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Event Not Found State
  if (!event) {
    return (
      <div className="h-full bg-ds-canvas text-ds-ink antialiased min-h-screen w-full">
        <div className="min-h-screen flex flex-row w-full bg-ds-canvas">
          <Sidebar currentUser={currentUser} />
          <main className="flex-1 min-w-0 bg-ds-canvas min-h-screen p-6 flex items-center justify-center w-full">
            <div className="max-w-md w-full bg-white border border-ds-line rounded-2xl p-8 text-center shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-ds-accent-soft text-ds-accent flex items-center justify-center mx-auto border border-ds-line">
                <span className="material-symbols-outlined text-[24px]">event_busy</span>
              </div>
              <h2 className="text-xl font-bold font-space text-ds-ink">Event Not Found</h2>
              <p className="text-sm text-ds-muted font-jakarta">The requested event could not be located in this workspace.</p>
              <Link href="/app/events" className="inline-flex items-center gap-2 px-4 py-2 bg-ds-accent text-white text-sm font-semibold rounded-xl hover:bg-ds-accent-strong transition-colors">
                Back to Events
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-ds-canvas text-ds-ink antialiased min-h-screen w-full">
      <div className="min-h-screen flex flex-row w-full bg-ds-canvas">
        {/* Left Persistent Sidebar (230px) */}
        <Sidebar
          currentUser={currentUser}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Right Main Content Area */}
        <main className="flex-1 min-w-0 bg-ds-canvas min-h-screen px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 overflow-y-auto w-full">
          <div className="w-full space-y-8">
            
            {/* 1. Top Navigation & Eyebrow */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/app/events/${eventId}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-[13px] text-ds-muted hover:text-ds-accent transition-colors group font-jakarta"
                >
                  <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform duration-150">
                    arrow_back
                  </span>
                  <span>Back to Workspace</span>
                </Link>

                {/* Mobile Menu Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-ds-ink bg-white border border-ds-line rounded-lg shadow-xs"
                  aria-label="Open navigation menu"
                >
                  <span className="material-symbols-outlined text-[16px]">menu</span>
                  <span>Menu</span>
                </button>
              </div>

              {/* Header Title & Primary Action */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-ds-muted">
                      EVENT WORKSPACE · {event.name}
                    </span>
                  </div>
                  <h1 className="text-[32px] md:text-[40px] tracking-tight font-bold text-ds-ink leading-none font-space">
                    TICKETS &amp; PRICING
                  </h1>
                  <p className="text-[14px] text-ds-muted font-jakarta">
                    Create ticket types, set pricing and control availability for your event.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    aria-disabled={isMigrationPending}
                    title={isMigrationPending ? 'Database migration pending: 20261012000000_tickets_and_pricing.sql' : 'Create Ticket'}
                    className={`inline-flex items-center gap-2 px-5 h-11 rounded-xl font-semibold text-[13px] transition-colors shadow-xs active:scale-[0.99] font-jakarta ${
                      isMigrationPending
                        ? 'bg-ds-line text-ds-muted cursor-not-allowed hover:bg-ds-line-strong'
                        : 'bg-ds-accent text-white hover:bg-ds-accent-strong cursor-pointer'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Create Ticket</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Notification Feedback Banners */}
            {successMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-jakarta flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-jakarta flex items-center gap-3">
                <span className="material-symbols-outlined text-rose-600 text-[20px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Migration Pending Notice */}
            {isMigrationPending && (
              <div className="p-5 bg-ds-canvas border border-ds-line rounded-2xl text-ds-ink font-jakarta space-y-2 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-[14px] text-ds-ink">
                  <span className="material-symbols-outlined text-ds-accent text-[20px]">database</span>
                  <span>Database Migration Notice</span>
                </div>
                <p className="text-[13px] text-ds-muted leading-relaxed">
                  The <code className="bg-white border border-ds-line px-1.5 py-0.5 rounded text-xs font-mono font-bold text-ds-ink">public.event_ticket_types</code> table has not yet been executed on the remote database.
                </p>
                <div className="flex items-center gap-2 text-[12px] text-ds-muted pt-0.5">
                  <span>Migration file:</span>
                  <code className="bg-white border border-ds-line px-2 py-0.5 rounded font-mono font-bold text-ds-accent">
                    20261012000000_tickets_and_pricing.sql
                  </code>
                </div>
              </div>
            )}

            {/* 2. Summary Cards (4 Cards) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Total Ticket Types */}
              <div className="bg-white border border-ds-line rounded-2xl p-6 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ds-muted font-jakarta">
                    Total Ticket Types
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-ds-accent">sell</span>
                </div>
                <div className="text-[28px] font-bold text-ds-ink font-space leading-tight">
                  {summary.totalTypes}
                </div>
                <p className="text-[12px] text-ds-muted font-jakarta">
                  Active &amp; draft tiers
                </p>
              </div>

              {/* Card 2: Tickets Sold */}
              <div className="bg-white border border-ds-line rounded-2xl p-6 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ds-muted font-jakarta">
                    Tickets Sold
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-emerald-600">confirmation_number</span>
                </div>
                <div className="text-[28px] font-bold text-emerald-700 font-space leading-tight">
                  {summary.ticketsSold}
                </div>
                <p className="text-[12px] text-ds-muted font-jakarta">
                  Confirmed attendee passes
                </p>
              </div>

              {/* Card 3: Tickets Remaining */}
              <div className="bg-white border border-ds-line rounded-2xl p-6 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ds-muted font-jakarta">
                    Tickets Remaining
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-ds-accent">inventory_2</span>
                </div>
                <div className="text-[28px] font-bold text-ds-ink font-space leading-tight">
                  {summary.ticketsRemaining}
                </div>
                <p className="text-[12px] text-ds-muted font-jakarta">
                  Available for booking
                </p>
              </div>

              {/* Card 4: Revenue (Real calculated revenue only: ₹0) */}
              <div className="bg-white border border-ds-line rounded-2xl p-6 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ds-muted font-jakarta">
                    Revenue
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-zinc-500">payments</span>
                </div>
                <div className="text-[28px] font-bold text-ds-ink font-space leading-tight">
                  {summary.revenueDisplay}
                </div>
                <p className="text-[12px] text-ds-muted font-jakarta">
                  {summary.revenueNotice}
                </p>
              </div>
            </section>

            {/* 3. Payment Gateway Configuration Status Notice */}
            <section className="bg-white border border-ds-line rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-ds-accent-soft text-ds-accent flex items-center justify-center shrink-0 border border-ds-line/60">
                  <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold text-ds-ink font-space">Payment Configuration</h3>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 font-mono text-[10px] font-semibold uppercase tracking-wider">
                      Not Configured
                    </span>
                  </div>
                  <p className="text-[13px] text-ds-muted font-jakarta leading-relaxed">
                    Online payment processing is not configured for this event. Free tickets can be booked immediately. Paid ticket checkout remains safely blocked until a payment provider is connected.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Ticket Types List / Table */}
            <section className="bg-white border border-ds-line rounded-2xl shadow-xs overflow-hidden">
              <div className="p-6 border-b border-ds-line flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-bold text-ds-ink font-space">Ticket Types</h2>
                  <p className="text-[13px] text-ds-muted font-jakarta">
                    Manage pricing, quantities, sales periods and visibility.
                  </p>
                </div>
                <span className="text-[12px] font-bold font-mono text-ds-muted bg-ds-canvas px-2.5 py-1 rounded-lg border border-ds-line">
                  {tickets.length} {tickets.length === 1 ? 'tier' : 'tiers'}
                </span>
              </div>

              {tickets.length === 0 ? (
                /* Empty State */
                <div className="py-20 px-6 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-ds-accent-soft text-ds-accent flex items-center justify-center mx-auto border border-ds-line">
                    <span className="material-symbols-outlined text-[28px]">sell</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-[18px] font-bold text-ds-ink font-space">No ticket types yet</h3>
                    <p className="text-[13px] text-ds-muted font-jakarta leading-relaxed">
                      Create your first ticket type to start accepting registrations. You can offer free or paid tiers with custom quotas and sales schedules.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    aria-disabled={isMigrationPending}
                    title={isMigrationPending ? 'Database migration pending: 20261012000000_tickets_and_pricing.sql' : 'Create Ticket'}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[13px] transition-colors shadow-xs ${
                      isMigrationPending
                        ? 'bg-ds-line text-ds-muted cursor-not-allowed hover:bg-ds-line-strong'
                        : 'bg-ds-accent text-white hover:bg-ds-accent-strong cursor-pointer'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Create Ticket</span>
                  </button>
                </div>
              ) : (
                /* Desktop Table & Mobile Cards */
                <div>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-ds-subtle border-b border-ds-line text-[11px] font-bold text-ds-muted uppercase tracking-wider font-jakarta">
                          <th className="px-6 py-3.5">Ticket Name</th>
                          <th className="px-6 py-3.5">Type &amp; Price</th>
                          <th className="px-6 py-3.5">Inventory</th>
                          <th className="px-6 py-3.5">Sales Period</th>
                          <th className="px-6 py-3.5">Visibility</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ds-line text-[13px] font-jakarta">
                        {tickets.map((ticket) => (
                          <tr key={ticket.id} className="hover:bg-ds-subtle/60 transition-colors">
                            {/* Ticket Name */}
                            <td className="px-6 py-4">
                              <div className="font-bold text-ds-ink font-space text-[14px]">
                                {ticket.name}
                              </div>
                              {ticket.description && (
                                <div className="text-[12px] text-ds-muted truncate max-w-xs mt-0.5" title={ticket.description}>
                                  {ticket.description}
                                </div>
                              )}
                            </td>

                            {/* Type & Price */}
                            <td className="px-6 py-4">
                              <div className="font-bold text-ds-ink font-mono text-[14px]">
                                {formatPaiseToINR(ticket.price_amount)}
                              </div>
                              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-0.5 ${
                                ticket.ticket_type === 'free' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                              }`}>
                                {ticket.ticket_type}
                              </span>
                            </td>

                            {/* Inventory */}
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[12px] text-ds-ink">
                                  <span className="font-semibold">{ticket.quantity_sold || 0}</span>
                                  <span className="text-ds-muted">/</span>
                                  <span className="font-semibold">{ticket.quantity_total} sold</span>
                                </div>
                                <div className="text-[11px] text-ds-muted">
                                  {ticket.quantity_remaining || 0} remaining
                                </div>
                              </div>
                            </td>

                            {/* Sales Period */}
                            <td className="px-6 py-4 text-[12px] text-ds-muted">
                              {formatSalesPeriod(ticket.sales_start_at, ticket.sales_end_at)}
                            </td>

                            {/* Visibility */}
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                ticket.visibility === 'public' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                              }`}>
                                <span className="material-symbols-outlined text-[13px]">
                                  {ticket.visibility === 'public' ? 'visibility' : 'visibility_off'}
                                </span>
                                <span className="capitalize">{ticket.visibility}</span>
                              </span>
                            </td>

                            {/* Derived Status */}
                            <td className="px-6 py-4">
                              {renderStatusBadge(ticket.derived_status)}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(ticket)}
                                  className="p-1.5 text-ds-muted hover:text-ds-accent hover:bg-ds-subtle rounded-lg transition-colors"
                                  title="Edit Ticket"
                                  aria-label={`Edit ${ticket.name}`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(ticket)}
                                  className="p-1.5 text-ds-muted hover:text-ds-ink hover:bg-ds-subtle rounded-lg transition-colors"
                                  title={ticket.is_active ? 'Deactivate Ticket' : 'Activate Ticket'}
                                  aria-label={ticket.is_active ? `Deactivate ${ticket.name}` : `Activate ${ticket.name}`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {ticket.is_active ? 'toggle_on' : 'toggle_off'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteModalTicket(ticket)}
                                  className="p-1.5 text-ds-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete / Deactivate Ticket"
                                  aria-label={`Delete or deactivate ${ticket.name}`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Cards */}
                  <div className="md:hidden divide-y divide-ds-line">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-ds-ink font-space text-[16px]">{ticket.name}</h3>
                            {ticket.description && (
                              <p className="text-[12px] text-ds-muted mt-0.5">{ticket.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-ds-ink font-mono text-[16px]">
                              {formatPaiseToINR(ticket.price_amount)}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ds-muted">
                              {ticket.ticket_type}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[12px] bg-ds-subtle p-3 rounded-xl border border-ds-line">
                          <div>
                            <span className="text-ds-muted block">Inventory:</span>
                            <span className="font-semibold text-ds-ink">
                              {ticket.quantity_sold || 0} / {ticket.quantity_total} sold
                            </span>
                          </div>
                          <div>
                            <span className="text-ds-muted block">Remaining:</span>
                            <span className="font-semibold text-ds-ink">{ticket.quantity_remaining || 0}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-ds-muted block">Sales Period:</span>
                            <span className="font-medium text-ds-ink">
                              {formatSalesPeriod(ticket.sales_start_at, ticket.sales_end_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(ticket.derived_status)}
                            <span className="text-[11px] font-semibold text-ds-muted capitalize">
                              {ticket.visibility}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(ticket)}
                              className="px-3 py-1.5 bg-white border border-ds-line text-ds-ink rounded-lg text-xs font-semibold hover:border-ds-accent"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteModalTicket(ticket)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                              aria-label="Delete ticket"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

          </div>
        </main>
      </div>

      {/* 5. Create / Edit Ticket Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          {isMigrationPending ? (
            /* Migration Setup Required Notice Dialog */
            <div className="bg-white border border-ds-line rounded-2xl w-full max-w-lg shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-ds-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                    <span className="material-symbols-outlined text-[22px]">database</span>
                  </div>
                  <div>
                    <h2 className="text-[18px] font-bold text-ds-ink font-space">
                      DATABASE SETUP REQUIRED
                    </h2>
                    <p className="text-[12px] text-ds-muted font-jakarta">
                      Ticket database table not initialized
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-ds-muted hover:text-ds-ink p-1.5 rounded-lg"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-3 font-jakarta text-[13px] text-ds-muted leading-relaxed">
                <p>
                  The ticket database has not been initialized for this environment.
                </p>
                <p className="font-semibold text-ds-ink">
                  Apply migration:
                </p>
                <div className="p-3 bg-ds-subtle border border-ds-line rounded-xl font-mono text-[12px] font-bold text-ds-ink select-all">
                  20261012000000_tickets_and_pricing.sql
                </div>
                <p>
                  before creating ticket types.
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t border-ds-line">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-ds-line hover:border-ds-accent text-ds-ink font-semibold text-[13px] rounded-xl transition-colors font-jakarta cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-ds-line rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-ds-line pb-4">
                <div>
                  <h2 className="text-[20px] font-bold text-ds-ink font-space">
                    {editingTicket ? 'Edit Ticket Type' : 'Create Ticket Type'}
                  </h2>
                  <p className="text-[13px] text-ds-muted font-jakarta">
                    Configure ticket pricing, sales period and purchase rules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-ds-muted hover:text-ds-ink p-1.5 rounded-lg"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Error in modal */}
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[13px] font-jakarta flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-rose-600 text-[18px] mt-0.5">error</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Modal Form */}
              <form onSubmit={handleSubmitForm} className="space-y-5 font-jakarta">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-ds-muted">
                  Basic Information
                </h3>

                <div className="space-y-1">
                  <label className="text-[13px] font-semibold text-ds-ink block">
                    Ticket Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Early Bird, General Admission, VIP"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-ds-line rounded-xl text-[14px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-semibold text-ds-ink block">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="What does this ticket include?"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-ds-line rounded-xl text-[14px] text-ds-ink focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent resize-y"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4 pt-2 border-t border-ds-line">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-ds-muted">
                  Pricing (INR)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ticket_type: 'paid' })}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      formData.ticket_type === 'paid'
                        ? 'border-ds-accent bg-ds-accent-soft text-ds-ink'
                        : 'border-ds-line bg-white text-ds-muted hover:border-ds-accent/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[13px]">Paid Ticket</div>
                      <div className="text-[11px]">Set custom price in INR</div>
                    </div>
                    {formData.ticket_type === 'paid' && (
                      <span className="material-symbols-outlined text-ds-accent text-[18px]">check_circle</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ticket_type: 'free', price_in_rupees: '0' })}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      formData.ticket_type === 'free'
                        ? 'border-ds-accent bg-ds-accent-soft text-ds-ink'
                        : 'border-ds-line bg-white text-ds-muted hover:border-ds-accent/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[13px]">Free Ticket</div>
                      <div className="text-[11px]">₹0 (Complimentary pass)</div>
                    </div>
                    {formData.ticket_type === 'free' && (
                      <span className="material-symbols-outlined text-ds-accent text-[18px]">check_circle</span>
                    )}
                  </button>
                </div>

                {formData.ticket_type === 'paid' && (
                  <div className="space-y-1">
                    <label className="text-[13px] font-semibold text-ds-ink block">
                      Price in INR (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-ds-muted">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="799"
                        value={formData.price_in_rupees}
                        onChange={(e) => setFormData({ ...formData, price_in_rupees: e.target.value })}
                        className="w-full pl-8 pr-4 py-2.5 bg-white border border-ds-line rounded-xl text-[14px] text-ds-ink font-mono focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent"
                      />
                    </div>
                    <p className="text-[11px] text-ds-muted">
                      Stored with integer precision in paise ({rupeesToPaise(formData.price_in_rupees)} paise).
                    </p>
                  </div>
                )}
              </div>

              {/* Inventory */}
              <div className="space-y-4 pt-2 border-t border-ds-line">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-ds-muted">
                  Inventory
                </h3>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-semibold text-ds-ink block">
                      Total Available Quantity *
                    </label>
                    {editingTicket && (editingTicket.quantity_sold || 0) > 0 && (
                      <span className="text-[11px] text-amber-700 font-medium">
                        Min allowed: {editingTicket.quantity_sold} (already sold)
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={editingTicket?.quantity_sold || 1}
                    required
                    placeholder="100"
                    value={formData.quantity_total}
                    onChange={(e) => setFormData({ ...formData, quantity_total: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-ds-line rounded-xl text-[14px] text-ds-ink font-mono focus:outline-none focus:border-ds-accent focus:ring-1 focus:ring-ds-accent"
                  />
                </div>
              </div>

              {/* Sales Period */}
              <div className="space-y-4 pt-2 border-t border-ds-line">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-ds-muted">
                  Sales Period (Optional)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-ds-muted block">
                      Sales Start
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.sales_start_at}
                      onChange={(e) => setFormData({ ...formData, sales_start_at: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-ds-muted block">
                      Sales End
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.sales_end_at}
                      onChange={(e) => setFormData({ ...formData, sales_end_at: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Purchase Rules & Visibility */}
              <div className="space-y-4 pt-2 border-t border-ds-line">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-ds-muted">
                  Purchase Rules &amp; Visibility
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-ds-muted block">
                      Min Tickets / Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.min_per_order}
                      onChange={(e) => setFormData({ ...formData, min_per_order: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-[13px] text-ds-ink font-mono focus:outline-none focus:border-ds-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-ds-muted block">
                      Max Tickets / Order
                    </label>
                    <input
                      type="number"
                      min={formData.min_per_order || 1}
                      required
                      value={formData.max_per_order}
                      onChange={(e) => setFormData({ ...formData, max_per_order: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-[13px] text-ds-ink font-mono focus:outline-none focus:border-ds-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-ds-muted block">
                      Visibility
                    </label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value as TicketVisibility })}
                      className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
                    >
                      <option value="public">Public (Website &amp; Registration)</option>
                      <option value="hidden">Hidden (Internal Only)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-ds-muted block">
                      Status
                    </label>
                    <select
                      value={formData.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                      className="w-full px-3 py-2 bg-white border border-ds-line rounded-xl text-[13px] text-ds-ink focus:outline-none focus:border-ds-accent"
                    >
                      <option value="active">Active (Available for purchase)</option>
                      <option value="inactive">Inactive (Disabled)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-ds-line">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-ds-line text-ds-ink font-semibold text-[13px] hover:bg-ds-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ds-accent text-white font-semibold text-[13px] hover:bg-ds-accent-strong transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingTicket ? 'Save Changes' : 'Create Ticket'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
          )}
        </div>
      )}

      {/* 6. Delete / Deactivate Confirmation Modal */}
      {deleteModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-ds-line rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-[18px] font-bold text-ds-ink font-space">
                {(deleteModalTicket.quantity_sold || 0) > 0 ? 'Deactivate Ticket Type?' : 'Delete Ticket Type?'}
              </h3>
              <p className="text-[13px] text-ds-muted font-jakarta leading-relaxed">
                {(deleteModalTicket.quantity_sold || 0) > 0 ? (
                  <>
                    This ticket type has <strong>{deleteModalTicket.quantity_sold} confirmed registration(s)</strong>. To preserve historical transaction data, it cannot be deleted. Instead, it will be safely <strong>deactivated</strong> and hidden from future sales.
                  </>
                ) : (
                  <>
                    Are you sure you want to delete <strong>&ldquo;{deleteModalTicket.name}&rdquo;</strong>? This action cannot be undone.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteModalTicket(null)}
                className="px-4 py-2 rounded-xl border border-ds-line text-ds-ink font-semibold text-[13px] hover:bg-ds-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-[13px] hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {isDeleting ? 'Processing...' : (deleteModalTicket.quantity_sold || 0) > 0 ? 'Deactivate' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
