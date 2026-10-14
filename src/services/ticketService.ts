import { createClient } from '@/lib/supabase/client';
import { 
  EventTicketType, 
  TicketType, 
  TicketVisibility, 
  TicketDerivedStatus, 
  PublicTicketAvailability 
} from '@/types';

// ==========================================
// Monetary Conversion Helpers (Paise <-> INR)
// ==========================================

/**
 * Convert INR Rupees to integer paise.
 * ₹799 -> 79900
 * Free / 0 -> 0
 */
export function rupeesToPaise(rupees: number | string): number {
  const numeric = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(numeric) || numeric <= 0) return 0;
  return Math.round(numeric * 100);
}

/**
 * Convert integer paise to INR Rupees.
 * 79900 -> 799
 */
export function paiseToRupees(paise: number): number {
  if (!paise || isNaN(paise)) return 0;
  return paise / 100;
}

/**
 * Format integer paise into a human-readable INR currency string.
 * 79900 -> "₹799"
 * 0 -> "Free"
 */
export function formatPaiseToINR(paise: number): string {
  if (paise === 0) return 'Free';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

// ==========================================
// Status Calculation Helper
// ==========================================

export function deriveTicketStatus(ticket: {
  is_active: boolean;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
  quantity_remaining?: number;
}): TicketDerivedStatus {
  if (!ticket.is_active) return 'inactive';

  const now = new Date();
  if (ticket.sales_start_at) {
    const start = new Date(ticket.sales_start_at);
    if (now < start) return 'scheduled';
  }

  if (ticket.sales_end_at) {
    const end = new Date(ticket.sales_end_at);
    if (now > end) return 'sales_ended';
  }

  if (ticket.quantity_remaining !== undefined && ticket.quantity_remaining <= 0) {
    return 'sold_out';
  }

  return 'on_sale';
}

// ==========================================
// DTOs
// ==========================================

export interface CreateTicketPayload {
  name: string;
  description?: string | null;
  ticket_type: TicketType;
  price_in_rupees?: number | string;
  quantity_total: number;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
  min_per_order?: number;
  max_per_order?: number;
  visibility?: TicketVisibility;
  is_active?: boolean;
}

export interface UpdateTicketPayload {
  name?: string;
  description?: string | null;
  ticket_type?: TicketType;
  price_in_rupees?: number | string;
  quantity_total?: number;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
  min_per_order?: number;
  max_per_order?: number;
  visibility?: TicketVisibility;
  is_active?: boolean;
}

export interface TicketSummaryMetrics {
  totalTypes: number;
  ticketsSold: number;
  ticketsRemaining: number;
  revenuePaise: number;
  revenueDisplay: string;
  revenueNotice: string;
}

export type DatabaseErrorCategory =
  | 'TABLE_NOT_FOUND'
  | 'POSTGREST_SCHEMA_CACHE_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_ERROR'
  | 'NETWORK_ERROR'
  | 'OTHER_DATABASE_ERROR';

export interface GetTicketTypesResult {
  tickets: EventTicketType[];
  isMigrationPending?: boolean;
  migrationMessage?: string;
  errorCategory?: DatabaseErrorCategory;
  diagnostics?: {
    supabaseHost: string;
    tableCheckStatus: string;
    errorCode?: string;
    errorMessage?: string;
    httpStatus?: number;
  };
}

/**
 * Accurately classify database errors to differentiate genuine table absence
 * from authentication, permissions (RLS), network, or schema-cache issues.
 */
export function classifyDatabaseError(error: any): DatabaseErrorCategory {
  if (!error) return 'OTHER_DATABASE_ERROR';

  const code = String(error.code || error.status || '');
  const message = String(error.message || error.details || error.hint || '').toLowerCase();

  // 1. Auth Errors (401, invalid/expired JWT, PGRST301)
  if (
    code === '401' ||
    code === 'PGRST301' ||
    message.includes('jwt') ||
    message.includes('token is expired') ||
    message.includes('invalid api key') ||
    message.includes('unauthorized') ||
    message.includes('not authenticated')
  ) {
    return 'AUTH_ERROR';
  }

  // 2. Permission / RLS Rejection (403, 42501)
  if (
    code === '403' ||
    code === '42501' ||
    message.includes('permission denied') ||
    message.includes('violates row-level security') ||
    message.includes('access denied')
  ) {
    return 'PERMISSION_ERROR';
  }

  // 3. Network / Offline Errors
  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return 'NETWORK_ERROR';
  }

  // 4. Genuine Table Not Found
  // PostgreSQL 42P01 (undefined_table) or PostgREST PGRST205 specifically for table
  if (
    code === '42P01' ||
    (code === 'PGRST205' && (message.includes('event_ticket_types') || message.includes('could not find the table'))) ||
    message.includes('relation "public.event_ticket_types" does not exist') ||
    message.includes('relation "event_ticket_types" does not exist')
  ) {
    return 'TABLE_NOT_FOUND';
  }

  // 5. PostgREST Schema Cache Issue
  if (
    message.includes('schema cache') &&
    (message.includes('could not find the table') || message.includes('reload schema'))
  ) {
    return 'POSTGREST_SCHEMA_CACHE_ERROR';
  }

  return 'OTHER_DATABASE_ERROR';
}

export function isTableMissingError(error: any): boolean {
  const category = classifyDatabaseError(error);
  return category === 'TABLE_NOT_FOUND' || category === 'POSTGREST_SCHEMA_CACHE_ERROR';
}

// ==========================================
// Ticket Service Implementation
// ==========================================

export const ticketService = {
  isTableMissingError,
  classifyDatabaseError,

  /**
   * Fetch all ticket types for an event with real database sold/remaining calculations.
   */
  getEventTicketTypes: async (eventId: string): Promise<GetTicketTypesResult> => {
    const supabase = createClient();
    const urlHost = (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname;
      } catch {
        return 'unknown';
      }
    })();

    try {
      // 1. Fetch ticket definitions
      const { data: ticketsData, error: ticketsError, status } = await supabase
        .from('event_ticket_types')
        .select('*')
        .eq('event_id', eventId)
        .order('price_amount', { ascending: true })
        .order('created_at', { ascending: true });

      const category = ticketsError ? classifyDatabaseError(ticketsError) : undefined;

      // Safe temporary diagnostic logging (no access tokens, keys, passwords, or secrets)
      if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
        console.info('[Tickets Diagnostic]', {
          supabaseHost: urlHost,
          tableCheckStatus: ticketsError ? 'error' : 'ok',
          errorCode: ticketsError?.code,
          errorMessage: ticketsError?.message,
          httpStatus: status,
          category: category || 'SUCCESS',
        });
      }

      if (ticketsError) {
        // Only classify as migration pending if genuinely TABLE_NOT_FOUND or schema cache out of sync
        if (category === 'TABLE_NOT_FOUND' || category === 'POSTGREST_SCHEMA_CACHE_ERROR') {
          return {
            tickets: [],
            isMigrationPending: true,
            migrationMessage: 'Database table public.event_ticket_types is not yet migrated.',
            errorCategory: category,
            diagnostics: {
              supabaseHost: urlHost,
              tableCheckStatus: 'error',
              errorCode: ticketsError.code,
              errorMessage: ticketsError.message,
              httpStatus: status,
            },
          };
        }

        // Auth, Permission, Network or other DB errors must NOT be marked as migration pending
        throw new Error(ticketsError.message || `Database query failed with category: ${category}`);
      }

      if (!ticketsData || ticketsData.length === 0) {
        return {
          tickets: [],
          isMigrationPending: false,
          diagnostics: {
            supabaseHost: urlHost,
            tableCheckStatus: 'ok',
            httpStatus: status,
          },
        };
      }

      // 2. Fetch sold counts from real registration records
      const { data: regsData, error: regsError } = await supabase
        .from('registrations')
        .select('ticket_type_id')
        .eq('event_id', eventId)
        .in('status', ['pending', 'confirmed'])
        .not('ticket_type_id', 'is', null);

      if (regsError) {
        console.warn('Could not load registration counts for tickets:', regsError);
      }

      // Aggregate sold count per ticket
      const soldMap = new Map<string, number>();
      if (regsData) {
        for (const reg of regsData) {
          if (reg.ticket_type_id) {
            soldMap.set(reg.ticket_type_id, (soldMap.get(reg.ticket_type_id) || 0) + 1);
          }
        }
      }

      // 3. Compute derived availability & status
      const tickets: EventTicketType[] = ticketsData.map((t: any) => {
        const sold = soldMap.get(t.id) || 0;
        const remaining = Math.max(0, (t.quantity_total || 0) - sold);
        const derived_status = deriveTicketStatus({
          is_active: t.is_active,
          sales_start_at: t.sales_start_at,
          sales_end_at: t.sales_end_at,
          quantity_remaining: remaining,
        });

        return {
          ...t,
          quantity_sold: sold,
          quantity_remaining: remaining,
          derived_status,
        };
      });

      return { tickets, isMigrationPending: false };
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return {
          tickets: [],
          isMigrationPending: true,
          migrationMessage: 'Database table public.event_ticket_types is not yet migrated.',
        };
      }
      throw err;
    }
  },

  /**
   * Fetch sanitized public ticket availability for public event registration.
   * Does NOT query or expose attendee registration records.
   */
  getPublicTicketAvailability: async (eventId: string): Promise<PublicTicketAvailability[]> => {
    const supabase = createClient();

    try {
      // Prefer dedicated restricted RPC
      const { data, error } = await supabase.rpc('get_event_ticket_availability', {
        p_event_id: eventId,
      });

      if (!error && Array.isArray(data)) {
        return data as PublicTicketAvailability[];
      }

      // Fallback: Query active public tickets directly if RPC is not yet registered
      const { data: ticketsData, error: tErr } = await supabase
        .from('event_ticket_types')
        .select('id, event_id, name, description, ticket_type, price_amount, currency, quantity_total, min_per_order, max_per_order, sales_start_at, sales_end_at')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .eq('visibility', 'public')
        .order('price_amount', { ascending: true });

      if (tErr || !ticketsData) return [];

      return ticketsData.map((t: any) => {
        const remaining = t.quantity_total; // Safe conservative estimate if registrations table cannot be queried by public
        const status = deriveTicketStatus({
          is_active: true,
          sales_start_at: t.sales_start_at,
          sales_end_at: t.sales_end_at,
          quantity_remaining: remaining,
        });

        return {
          id: t.id,
          event_id: t.event_id,
          name: t.name,
          description: t.description,
          ticket_type: t.ticket_type,
          price_amount: t.price_amount,
          currency: t.currency || 'INR',
          quantity_total: t.quantity_total,
          quantity_sold: 0,
          quantity_remaining: remaining,
          min_per_order: t.min_per_order || 1,
          max_per_order: t.max_per_order || 10,
          sales_start_at: t.sales_start_at,
          sales_end_at: t.sales_end_at,
          status,
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Create a new ticket type.
   */
  createTicketType: async (eventId: string, payload: CreateTicketPayload): Promise<EventTicketType> => {
    const supabase = createClient();

    // Validation
    if (!payload.name || !payload.name.trim()) {
      throw new Error('Ticket name is required');
    }

    const isFree = payload.ticket_type === 'free';
    const priceAmount = isFree ? 0 : rupeesToPaise(payload.price_in_rupees || 0);

    if (!isFree && priceAmount <= 0) {
      throw new Error('Paid tickets must have a price greater than ₹0');
    }

    const quantityTotal = parseInt(String(payload.quantity_total), 10);
    if (isNaN(quantityTotal) || quantityTotal < 1) {
      throw new Error('Quantity must be at least 1');
    }

    const minPerOrder = payload.min_per_order ? parseInt(String(payload.min_per_order), 10) : 1;
    const maxPerOrder = payload.max_per_order ? parseInt(String(payload.max_per_order), 10) : 10;

    if (minPerOrder < 1) {
      throw new Error('Minimum tickets per order must be at least 1');
    }
    if (maxPerOrder < minPerOrder) {
      throw new Error('Maximum tickets per order cannot be less than minimum');
    }

    if (payload.sales_start_at && payload.sales_end_at) {
      const start = new Date(payload.sales_start_at);
      const end = new Date(payload.sales_end_at);
      if (end < start) {
        throw new Error('Sales end date cannot be earlier than sales start date');
      }
    }

    const record = {
      event_id: eventId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      ticket_type: payload.ticket_type,
      price_amount: priceAmount,
      currency: 'INR',
      quantity_total: quantityTotal,
      sales_start_at: payload.sales_start_at || null,
      sales_end_at: payload.sales_end_at || null,
      min_per_order: minPerOrder,
      max_per_order: maxPerOrder,
      visibility: payload.visibility || 'public',
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    };

    const { data, error } = await supabase
      .from('event_ticket_types')
      .insert(record)
      .select('*')
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        throw new Error('Database table public.event_ticket_types has not been migrated yet. Please apply migration 20261012000000_tickets_and_pricing.sql.');
      }
      throw new Error(error.message || 'Failed to create ticket');
    }

    // Auto-enable registration settings whenever a ticket type is created
    try {
      await supabase
        .from('event_registration_settings')
        .upsert({
          event_id: eventId,
          is_enabled: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'event_id' });
    } catch (sErr) {
      console.warn('Could not auto-enable registration settings:', sErr);
    }

    return {
      ...data,
      quantity_sold: 0,
      quantity_remaining: data.quantity_total,
      derived_status: deriveTicketStatus({
        is_active: data.is_active,
        sales_start_at: data.sales_start_at,
        sales_end_at: data.sales_end_at,
        quantity_remaining: data.quantity_total,
      }),
    };
  },

  /**
   * Update an existing ticket type with safety checks preventing inventory reduction below sold count.
   */
  updateTicketType: async (
    ticketId: string, 
    payload: UpdateTicketPayload
  ): Promise<EventTicketType> => {
    const supabase = createClient();

    // 1. Fetch current ticket & sold count
    const { data: currentTicket, error: fetchError } = await supabase
      .from('event_ticket_types')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError || !currentTicket) {
      if (isTableMissingError(fetchError)) {
        throw new Error('Database table public.event_ticket_types has not been migrated yet.');
      }
      throw new Error(fetchError?.message || 'Ticket type not found');
    }

    const { count: soldCount } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('ticket_type_id', ticketId)
      .in('status', ['pending', 'confirmed']);

    const currentSold = soldCount || 0;

    // 2. Validate inventory update
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) {
      if (!payload.name.trim()) throw new Error('Ticket name is required');
      updates.name = payload.name.trim();
    }

    if (payload.description !== undefined) {
      updates.description = payload.description?.trim() || null;
    }

    if (payload.ticket_type !== undefined) {
      updates.ticket_type = payload.ticket_type;
      if (payload.ticket_type === 'free') {
        updates.price_amount = 0;
      }
    }

    if (payload.price_in_rupees !== undefined && updates.ticket_type !== 'free' && currentTicket.ticket_type !== 'free') {
      const priceAmount = rupeesToPaise(payload.price_in_rupees);
      if (priceAmount <= 0) {
        throw new Error('Paid tickets must have a price greater than ₹0');
      }
      updates.price_amount = priceAmount;
    }

    if (payload.quantity_total !== undefined) {
      const qty = parseInt(String(payload.quantity_total), 10);
      if (isNaN(qty) || qty < 1) {
        throw new Error('Quantity must be at least 1');
      }
      if (qty < currentSold) {
        throw new Error(`Quantity cannot be lower than tickets already sold (${currentSold}).`);
      }
      updates.quantity_total = qty;
    }

    if (payload.sales_start_at !== undefined) {
      updates.sales_start_at = payload.sales_start_at || null;
    }
    if (payload.sales_end_at !== undefined) {
      updates.sales_end_at = payload.sales_end_at || null;
    }

    const effectiveStart = updates.sales_start_at !== undefined ? updates.sales_start_at : currentTicket.sales_start_at;
    const effectiveEnd = updates.sales_end_at !== undefined ? updates.sales_end_at : currentTicket.sales_end_at;
    if (effectiveStart && effectiveEnd) {
      if (new Date(effectiveEnd) < new Date(effectiveStart)) {
        throw new Error('Sales end date cannot be earlier than sales start date');
      }
    }

    if (payload.min_per_order !== undefined) {
      const minVal = parseInt(String(payload.min_per_order), 10);
      if (isNaN(minVal) || minVal < 1) throw new Error('Minimum tickets per order must be at least 1');
      updates.min_per_order = minVal;
    }

    if (payload.max_per_order !== undefined) {
      const maxVal = parseInt(String(payload.max_per_order), 10);
      const minVal = updates.min_per_order || currentTicket.min_per_order;
      if (isNaN(maxVal) || maxVal < minVal) throw new Error('Maximum tickets per order cannot be less than minimum');
      updates.max_per_order = maxVal;
    }

    if (payload.visibility !== undefined) {
      updates.visibility = payload.visibility;
    }

    if (payload.is_active !== undefined) {
      updates.is_active = payload.is_active;
    }

    // 3. Apply updates
    const { data: updatedData, error: updateError } = await supabase
      .from('event_ticket_types')
      .update(updates)
      .eq('id', ticketId)
      .select('*')
      .single();

    if (updateError) {
      if (isTableMissingError(updateError)) {
        throw new Error('Database table public.event_ticket_types has not been migrated yet.');
      }
      throw new Error(updateError.message || 'Failed to update ticket');
    }

    const remaining = Math.max(0, updatedData.quantity_total - currentSold);
    return {
      ...updatedData,
      quantity_sold: currentSold,
      quantity_remaining: remaining,
      derived_status: deriveTicketStatus({
        is_active: updatedData.is_active,
        sales_start_at: updatedData.sales_start_at,
        sales_end_at: updatedData.sales_end_at,
        quantity_remaining: remaining,
      }),
    };
  },

  /**
   * Safe Delete / Deactivate action:
   * - If historical registrations exist: Deactivates ticket (is_active = false) to protect audit trail.
   * - If no registrations exist: Deletes ticket.
   */
  deleteOrDeactivateTicketType: async (
    ticketId: string
  ): Promise<{ action: 'deleted' | 'deactivated'; message: string }> => {
    const supabase = createClient();

    // Check existing registrations referencing this ticket
    const { count, error: countErr } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('ticket_type_id', ticketId);

    if (countErr) {
      if (isTableMissingError(countErr)) {
        throw new Error('Database table public.event_ticket_types has not been migrated yet.');
      }
      console.warn('Could not check registration count:', countErr);
    }

    const soldCount = count || 0;

    if (soldCount > 0) {
      // Must not hard-delete; deactivate instead
      const { error: deactErr } = await supabase
        .from('event_ticket_types')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (deactErr) {
        if (isTableMissingError(deactErr)) {
          throw new Error('Database table public.event_ticket_types has not been migrated yet.');
        }
        throw new Error(deactErr.message || 'Failed to deactivate ticket');
      }

      return {
        action: 'deactivated',
        message: `Ticket type has ${soldCount} existing registration(s) and was deactivated to preserve historical records.`,
      };
    }

    // Unused ticket: hard delete is safe
    const { error: delErr } = await supabase
      .from('event_ticket_types')
      .delete()
      .eq('id', ticketId);

    if (delErr) {
      if (isTableMissingError(delErr)) {
        throw new Error('Database table public.event_ticket_types has not been migrated yet.');
      }
      throw new Error(delErr.message || 'Failed to delete ticket');
    }

    return {
      action: 'deleted',
      message: 'Ticket type deleted successfully.',
    };
  },

  /**
   * Summary KPI metrics calculation.
   */
  getTicketSummaryMetrics: (tickets: EventTicketType[]): TicketSummaryMetrics => {
    const totalTypes = tickets.length;
    let ticketsSold = 0;
    let ticketsRemaining = 0;

    for (const t of tickets) {
      const sold = t.quantity_sold || 0;
      ticketsSold += sold;
      ticketsRemaining += t.quantity_remaining !== undefined
        ? t.quantity_remaining
        : Math.max(0, (t.quantity_total || 0) - sold);
    }

    // Revenue rule: Real revenue only. Currently no payment gateway configured.
    return {
      totalTypes,
      ticketsSold,
      ticketsRemaining,
      revenuePaise: 0,
      revenueDisplay: '₹0',
      revenueNotice: 'No paid sales yet',
    };
  },
};
