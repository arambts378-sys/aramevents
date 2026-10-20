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

    // Get email integration
    const { data: integrations } = await adminSupabase
      .from('event_integrations')
      .select('config')
      .eq('event_id', eventId)
      .eq('provider', 'email')
      .eq('is_active', true)
      .single();

    if (!integrations || !integrations.config) {
      // Rollback session if email is not configured
      await adminSupabase.from('volunteer_scanner_sessions').delete().eq('id', session.id);
      return NextResponse.json({ error: 'Email integration is not configured for this event.' }, { status: 400 });
    }

    const { data: fullZones } = await supabase.from('access_zones').select('name').in('id', zoneIds);
    const zoneNames = fullZones?.map(z => z.name) || [];

    const { data: fullDistances } = distanceCategoryIds.length > 0 
      ? await supabase.from('walkathon_distance_categories').select('name').in('id', distanceCategoryIds)
      : { data: [] };
    const distanceNames = fullDistances?.map(d => d.name) || [];

    try {
      const { emailProvider } = await import('@/services/integrations/providers/email');
      await emailProvider.sendScannerAccess(
        integrations.config,
        event,
        {
          volunteerEmail: volunteerEmail.trim().toLowerCase(),
          scannerLink,
          allowedZones: zoneNames,
          allowedDistances: distanceNames,
          expiresAt: expDate.toISOString()
        }
      );
    } catch (emailErr: any) {
      // Rollback session if email fails
      await adminSupabase.from('volunteer_scanner_sessions').delete().eq('id', session.id);
      console.error('Failed to send scanner access email');
      return NextResponse.json({ error: 'Failed to send email. Session was not created.' }, { status: 500 });
    }

    // Retain only safe metadata in logs; never log raw tokens or full secret URLs (M7)
    console.log(`[SCANNER_SESSION] Created session ${session.id} for event ${event.id}`);

    return NextResponse.json({
      success: true,
      message: 'Scanner session created successfully and email sent.',
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
