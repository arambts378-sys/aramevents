import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  try {
    const { eventId, registrationId } = await params;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate Event & Registration
    const adminClient = createAdminClient();
    
    // Check if event exists and if user has access to its workspace
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, workspace_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
    }

    // Require registrations.manage permission (M13)
    const { data: hasPerm } = await supabase.rpc('has_permission', {
      workspace_id: event.workspace_id,
      required_permission: 'registrations.manage'
    });

    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden. You do not have permission to resend tickets.' }, { status: 403 });
    }

    // Enforce 60-second per-registration cooldown (M13)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentJobs } = await adminClient
      .from('integration_jobs')
      .select('id')
      .eq('registration_id', registrationId)
      .eq('event_type', 'qr_delivery')
      .gte('created_at', oneMinuteAgo);

    if (recentJobs && recentJobs.length > 0) {
      return NextResponse.json(
        { error: 'Please wait at least 60 seconds before resending this ticket.' },
        { status: 429 }
      );
    }

    const { data: registration, error: regError } = await adminClient
      .from('registrations')
      .select(`
        id,
        registration_number,
        status,
        event_people (
          people (
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .eq('id', registrationId)
      .eq('event_id', eventId)
      .single();

    if (regError || !registration) {
      return NextResponse.json({ error: 'Registration not found for this event' }, { status: 404 });
    }

    if (registration.status !== 'confirmed') {
      return NextResponse.json({ error: 'Registration is not confirmed' }, { status: 400 });
    }

    const eventPerson = Array.isArray(registration.event_people) ? registration.event_people[0] : registration.event_people;
    const person = eventPerson && typeof eventPerson === 'object' && 'people' in eventPerson ? eventPerson.people : null;
    const personData: any = Array.isArray(person) ? person[0] : person;

    if (!personData || !personData.email) {
      return NextResponse.json({ error: 'Attendee email not found' }, { status: 400 });
    }

    // 3. Find the existing active QR credential
    const { data: credential, error: credError } = await adminClient
      .from('qr_credentials')
      .select('id')
      .eq('event_id', eventId)
      .eq('registration_id', registrationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (credError || !credential) {
      return NextResponse.json({ error: 'No active QR credential found to resend. Please regenerate it first.' }, { status: 400 });
    }

    // 4. Create a new qr_delivery integration job with concurrency-safe bucketed idempotency key
    const cooldownBucket = Math.floor(Date.now() / 60000);
    const idempotencyKey = `${eventId}:${registrationId}:email:qr_delivery:resend_${cooldownBucket}`;
    
    const payload = {
      registrationId: registration.id,
      registrationNumber: registration.registration_number,
      attendee: {
        firstName: personData.first_name,
        lastName: personData.last_name,
        email: personData.email,
        phone: personData.phone
      },
      isResend: true
    };

    const { error: jobError } = await adminClient
      .from('integration_jobs')
      .insert({
        event_id: eventId,
        registration_id: registrationId,
        provider: 'email',
        event_type: 'qr_delivery',
        payload: payload,
        idempotency_key: idempotencyKey,
        next_attempt_at: new Date().toISOString()
      });

    if (jobError) {
      // If unique constraint on idempotency_key triggers, it's a concurrent race
      if (jobError.code === '23505') {
        return NextResponse.json(
          { error: 'A ticket resend is already being processed for this registration.' },
          { status: 429 }
        );
      }
      console.error('Failed to create resend job');
      return NextResponse.json({ error: 'Failed to enqueue resend job' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Ticket resend initiated successfully.' });
  } catch (error: any) {
    console.error('Error in resend ticket:', error?.message || error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
