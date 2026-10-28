import { NextRequest, NextResponse } from 'next/server';
import { TeamError, resolveActor, revokeInvitation } from '@/services/team.server';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ invitationId: string }> }) {
  try {
    const { invitationId } = await params;
    const actor = await resolveActor(req.nextUrl.searchParams.get('workspaceId'));
    await revokeInvitation(actor, invitationId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof TeamError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('[workspace/team] revoke failed', { name: (err as Error)?.name });
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
