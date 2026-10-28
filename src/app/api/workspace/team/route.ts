import { NextRequest, NextResponse } from 'next/server';
import { TeamError, inviteMember, listTeam, resolveActor } from '@/services/team.server';
import { sendPlatformEmail } from '@/services/organizerMailer';
import { createAdminClient } from '@/lib/supabase/admin';

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', editor: 'Editor', member: 'Member', viewer: 'Viewer' };

function fail(err: unknown, context: string) {
  if (err instanceof TeamError) return NextResponse.json({ error: err.message }, { status: err.status });
  const e = err as { name?: string; code?: string } | null;
  console.error(`[workspace/team] ${context}`, { name: e?.name, code: e?.code });
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function GET(req: NextRequest) {
  try {
    const actor = await resolveActor(req.nextUrl.searchParams.get('workspaceId'));
    return NextResponse.json(await listTeam(actor));
  } catch (err) {
    return fail(err, 'list failed');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const actor = await resolveActor(body.workspaceId);
    const invite = await inviteMember(actor, body.email, String(body.role || ''));

    const origin = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/+$/, '');
    const link = `${origin}/invite?token=${invite.token}`;

    const admin = createAdminClient();
    const [{ data: ws }, { data: inviter }] = await Promise.all([
      admin.from('workspaces').select('name').eq('id', actor.workspaceId).single(),
      admin.from('profiles').select('full_name').eq('id', actor.userId).maybeSingle(),
    ]);
    const workspaceName = ws?.name || 'an Aram Events workspace';
    const inviterName = inviter?.full_name || actor.email;
    const role = ROLE_LABEL[invite.role] || invite.role;

    let emailSent = true;
    try {
      await sendPlatformEmail({
        to: invite.email,
        subject: `${inviterName} invited you to ${workspaceName} on Aram Events`,
        text: `${inviterName} invited you to join ${workspaceName} on Aram Events as ${role}.\n\nAccept the invitation: ${link}\n\nSign in or create an account with this email address (${invite.email}). The invitation expires in 7 days.`,
        html: `<p>${escape(inviterName)} invited you to join <strong>${escape(workspaceName)}</strong> on Aram Events as <strong>${escape(role)}</strong>.</p><p><a href="${escape(link)}">Accept the invitation</a></p><p>Sign in or create an account with this email address (${escape(invite.email)}). The invitation expires in 7 days.</p>`,
      });
    } catch (mailErr) {
      emailSent = false;
      const e = mailErr as { name?: string; code?: string } | null;
      console.error('[workspace/team] invitation email failed', { name: e?.name, code: e?.code });
    }

    // The link is returned so the inviter can share it directly if the email did not go out.
    return NextResponse.json({ success: true, invitation: { id: invite.id, email: invite.email, role: invite.role }, link, emailSent });
  } catch (err) {
    return fail(err, 'invite failed');
  }
}
