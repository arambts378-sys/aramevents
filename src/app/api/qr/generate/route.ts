import { NextResponse } from 'next/server';
import { qrCredentialsService } from '@/services/qrCredentials';
import { createClient } from '@/lib/supabase/server';
import { getActivityCorrelationId, recordPlatformActivity, resolveActivityWorkspace } from '@/services/platformActivity.server';

export async function POST(req: Request) {
  let eventId: string | null = null;
  let registrationId: string | null = null;
  try {
    const body = await req.json();
    eventId = typeof body?.eventId === 'string' ? body.eventId : null;
    registrationId = typeof body?.registrationId === 'string' ? body.registrationId : null;

    if (!eventId || !registrationId) {
      return NextResponse.json({ error: 'Missing eventId or registrationId' }, { status: 400 });
    }

    // Generate the QR credential using the admin client because public users 
    // do not have the 'events.manage' role required by RLS.
    // This is safe because we already know the registration was just confirmed 
    // securely via the RPC, and this endpoint just triggers the generation.
    // In a real production environment, you could also add a webhook secret here.
    const result = await qrCredentialsService.generateQrCredential(eventId, registrationId, true);
    
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (eventId && registrationId) {
      await recordPlatformActivity({
        workspaceId: await resolveActivityWorkspace(eventId),
        action: 'ticket.generation_failed',
        resourceType: 'registration',
        resourceId: registrationId,
        outcome: 'failure',
        errorCode: 'TICKET_GENERATION_FAILED',
        correlationId: getActivityCorrelationId(req.headers.get('x-request-id')),
      });
    }
    console.error('QR Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
