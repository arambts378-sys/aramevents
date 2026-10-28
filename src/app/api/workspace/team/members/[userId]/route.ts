import { NextRequest, NextResponse } from 'next/server';
import { TeamError, changeMemberRole, removeMember, resolveActor } from '@/services/team.server';

function fail(err: unknown, context: string) {
  if (err instanceof TeamError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(`[workspace/team] ${context}`, { name: (err as Error)?.name });
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const actor = await resolveActor(body.workspaceId);
    await changeMemberRole(actor, userId, String(body.role || ''));
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, 'role change failed');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const actor = await resolveActor(req.nextUrl.searchParams.get('workspaceId'));
    await removeMember(actor, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, 'remove failed');
  }
}
