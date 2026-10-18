import { NextResponse } from 'next/server';
import { accessControlService } from '@/services/accessControl';
import { createClient } from '@/lib/supabase/server';
import { getActivityCorrelationId, recordPlatformActivity, resolveActivityWorkspace } from '@/services/platformActivity.server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  let eventId: string | null = null;
  let actorUserId: string | null = null;
  try {
    ({ eventId } = await params);
    const { credential, accessZoneId, scannerToken } = await request.json();

    if (!credential || !accessZoneId) {
      return NextResponse.json(
        { success: false, result: 'denied', reason: 'bad_request', message: 'Missing credential or accessZoneId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    actorUserId = user?.id ?? null;

    if (!user && !scannerToken) {
      return NextResponse.json(
        { success: false, result: 'denied', reason: 'unauthorized', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call authoritative evaluateCheckInAccess service which wraps the postgres RPC
    const checkInResult = await accessControlService.evaluateCheckInAccess(credential, accessZoneId, scannerToken);
    const failuresWithoutCheckInRecord = new Set([
      'zone_not_found',
      'event_not_found',
      'invalid_scanner_token',
      'revoked_scanner_token',
      'expired_scanner_token',
      'wrong_event_scanner_token',
      'unauthorized_zone',
      'unauthorized',
      'invalid_qr',
      'registration_not_found',
    ]);
    if (
      checkInResult.success === false &&
      checkInResult.reason &&
      failuresWithoutCheckInRecord.has(checkInResult.reason)
    ) {
      await recordPlatformActivity({
        workspaceId: await resolveActivityWorkspace(eventId),
        actorUserId,
        action: 'check_in.failed',
        resourceType: 'event',
        resourceId: eventId,
        outcome: 'failure',
        errorCode: 'CHECK_IN_FAILED',
        correlationId: getActivityCorrelationId(request.headers.get('x-request-id')),
      });
    }

    // Ensure event isolation on API route level is safe: the RPC enforces event isolation internally.
    return NextResponse.json(checkInResult);
  } catch (error: any) {
    if (eventId) {
      await recordPlatformActivity({
        workspaceId: await resolveActivityWorkspace(eventId),
        actorUserId,
        action: 'check_in.failed',
        resourceType: 'event',
        resourceId: eventId,
        outcome: 'failure',
        errorCode: 'CHECK_IN_FAILED',
        correlationId: getActivityCorrelationId(request.headers.get('x-request-id')),
      });
    }
    console.error('Check-in error:', error);
    return NextResponse.json(
      { success: false, result: 'denied', reason: 'internal_error', message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
