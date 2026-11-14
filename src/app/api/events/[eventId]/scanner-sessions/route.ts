import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { volunteerEmail, distanceCategoryIds = [], zoneIds = [], expiresAt } = body;

    if (!volunteerEmail || typeof volunteerEmail !== 'string') {
      return NextResponse.json({ error: 'Valid volunteerEmail required' }, { status: 400 });
    }
    if (!Array.isArray(zoneIds) || zoneIds.length === 0) {
      return NextResponse.json({ error: 'At least one zone is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: event } = await supabase.from('events').select('id, workspace_id, name').eq('id', eventId).single();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const { data: hasPerm } = await supabase.rpc('has_permission', {
        workspace_id: event.workspace_id,
        required_permission: 'volunteers.manage'
    });

    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Validate distance categories
    if (distanceCategoryIds.length > 0) {
        const { data: categories } = await supabase
            .from('walkathon_distance_categories')
            .select('id')
            .eq('event_id', eventId)
            .in('id', distanceCategoryIds);
        
        if (!categories || categories.length !== distanceCategoryIds.length) {
            return NextResponse.json({ error: 'Invalid or cross-event distance categories selected' }, { status: 400 });
        }
    }

    // Validate zones
    const { data: zones } = await supabase
        .from('access_zones')
        .select('id')
        .eq('event_id', eventId)
        .in('id', zoneIds);

    if (!zones || zones.length !== zoneIds.length) {
        return NextResponse.json({ error: 'Invalid or cross-event zones selected' }, { status: 400 });
    }

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const allowedScopes = { distance_category_ids: distanceCategoryIds };
    
    // Enforce maximum token lifetime of 7 days (M7)
    const MAX_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
    const requestedExp = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 24 * 60 * 60 * 1000;
    const maxAllowedExp = Date.now() + MAX_LIFETIME_MS;
    const finalExpTime = Math.min(Math.max(requestedExp, Date.now() + 60 * 1000), maxAllowedExp);
    const expDate = new Date(finalExpTime);

    const adminSupabase = createAdminClient();

    const { data: session, error: insertError } = await adminSupabase
      .from('volunteer_scanner_sessions')
      .insert({
        event_id: eventId,
        volunteer_email: volunteerEmail.trim().toLowerCase(),
        token_hash: tokenHash,
        allowed_scopes: allowedScopes,
        status: 'active',
        expires_at: expDate.toISOString()
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    // Insert zones
    const zoneInserts = zoneIds.map(zoneId => ({
        session_id: session.id,
        zone_id: zoneId
    }));

    const { error: zoneInsertError } = await adminSupabase
        .from('volunteer_scanner_zones')
        .insert(zoneInserts);
        
    if (zoneInsertError) throw zoneInsertError;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const scannerLink = `${appUrl}/volunteer/scanner/${rawToken}`;

    const { data: fullZones } = await supabase.from('access_zones').select('name').in('id', zoneIds);
    const zoneNames = fullZones?.map(z => z.name) || [];

    const { data: fullDistances } = distanceCategoryIds.length > 0
      ? await supabase.from('walkathon_distance_categories').select('name').in('id', distanceCategoryIds)
      : { data: [] };
    const distanceNames = fullDistances?.map(d => d.name) || [];

    const details = {
      volunteerEmail: volunteerEmail.trim().toLowerCase(),
      scannerLink,
      allowedZones: zoneNames,
      allowedDistances: distanceNames,
      expiresAt: expDate.toISOString(),
    };

    // The event's own email settings (Integrations page) are used when they are set up. Otherwise,
    // or if that server rejects the send, the access link goes out through Aram's platform mailer,
    // so organizers do not have to configure SMTP just to invite a volunteer.
    const { data: integration } = await adminSupabase
      .from('event_integrations')
      .select('config')
      .eq('event_id', eventId)
      .eq('provider', 'email')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const { emailProvider, buildScannerAccessEmail } = await import('@/services/integrations/providers/email');
    let sentVia: 'event' | 'platform' | 'simulated' | null = null;
    let eventSmtpError: string | null = null;

    if (integration?.config?.host) {
      try {
        await emailProvider.sendScannerAccess(integration.config, event, details);
        sentVia = 'event';
      } catch (err) {
        eventSmtpError = (err as Error)?.message || 'unknown error';
        console.warn(`[SCANNER_SESSION] Event email settings failed for event ${event.id}; trying the platform mailer`);
      }
    }

    if (!sentVia) {
      const { sendPlatformEmail, isPlatformMailConfigured } = await import('@/services/organizerMailer');
      if (await isPlatformMailConfigured()) {
        try {
          const mail = buildScannerAccessEmail(event, details);
          await sendPlatformEmail({ to: details.volunteerEmail, ...mail, replyTo: user.email ?? undefined });
          sentVia = 'platform';
        } catch (err) {
          console.error(`[SCANNER_SESSION] Platform mailer failed for event ${event.id}:`, (err as Error)?.message);
        }
      } else if (process.env.NODE_ENV === 'development') {
        // Local development without any mail route: keep the session and hand the link to the organizer.
        sentVia = 'simulated';
      }
    }

    if (!sentVia) {
      await adminSupabase.from('volunteer_scanner_sessions').delete().eq('id', session.id);
      const reason = eventSmtpError === 'EMAIL_INTEGRATION_NOT_CONFIGURED'
        ? 'The email settings for this event could not be read. Save them again on the Integrations page.'
        : 'The access email could not be sent. Check the volunteer\'s address, or the email settings on the Integrations page, and try again.';
      return NextResponse.json({ error: reason }, { status: 502 });
    }

    // Retain only safe metadata in logs; never log raw tokens or full secret URLs (M7)
    console.log(`[SCANNER_SESSION] Created session ${session.id} for event ${event.id}`);

    return NextResponse.json({
      success: true,
      sentVia,
      message: sentVia === 'simulated'
        ? 'Scanner access created. Email is not set up on this computer, so copy the link below and send it yourself.'
        : `Scanner access sent to ${details.volunteerEmail}.`,
      // Only in local development with no mail route, so the link can still be tested.
      ...(sentVia === 'simulated' ? { scannerLink } : {}),
    });

  } catch (error: any) {
    console.error('Error creating scanner session:', error?.message || error);
    return NextResponse.json({ error: 'Failed to create scanner session.' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: event } = await supabase.from('events').select('workspace_id').eq('id', eventId).single();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const { data: hasPerm } = await supabase.rpc('has_permission', {
        workspace_id: event.workspace_id,
        required_permission: 'volunteers.view'
    });

    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('volunteer_scanner_sessions')
      .select(`
        id,
        volunteer_email,
        status,
        expires_at,
        created_at,
        last_used_at,
        allowed_scopes,
        volunteer_scanner_zones (
          zone_id,
          access_zones (name)
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (sessionsError) throw sessionsError;

    // Fetch zones
    const { data: zones } = await supabase
      .from('access_zones')
      .select('id, name')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('name');

    // Fetch distance categories
    const { data: distances } = await supabase
      .from('walkathon_distance_categories')
      .select('id, name')
      .eq('event_id', eventId)
      .order('name');

    return NextResponse.json({
      sessions: sessions || [],
      zones: zones || [],
      distances: distances || []
    });

  } catch (error: any) {
    console.error('Error fetching scanner sessions:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
