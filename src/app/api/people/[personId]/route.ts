import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Removes a person from the workspace. Their registrations go with them (and through the
 * database's cascades, their tickets, QR codes and check-ins), because `registrations.person_id`
 * would otherwise block the delete. Event links in `event_people` cascade on their own.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  if (!UUID.test(personId)) return NextResponse.json({ error: 'Person not found.' }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  // Read through the signed-in session, so RLS decides whether this person is visible at all.
  const { data: person } = await supabase
    .from('people')
    .select('id, workspace_id, first_name, last_name, email')
    .eq('id', personId)
    .maybeSingle();
  if (!person) return NextResponse.json({ error: 'Person not found.' }, { status: 404 });

  const { data: allowed } = await supabase.rpc('has_permission', {
    workspace_id: person.workspace_id,
    required_permission: 'people.manage',
  });
  if (!allowed) {
    return NextResponse.json({ error: 'You do not have permission to remove people in this workspace.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { count: registrations, error: regError } = await admin
    .from('registrations')
    .delete({ count: 'exact' })
    .eq('person_id', personId);
  if (regError) {
    console.error('[people] registration delete failed', { personId, code: regError.code });
    return NextResponse.json({ error: 'Their registrations could not be removed, so the person was kept.' }, { status: 500 });
  }

  const { error } = await admin.from('people').delete().eq('id', personId).eq('workspace_id', person.workspace_id);
  if (error) {
    console.error('[people] delete failed', { personId, code: error.code });
    return NextResponse.json({ error: 'The person could not be removed. Try again.' }, { status: 500 });
  }

  const name = [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email || 'Person';
  return NextResponse.json({ success: true, message: `${name} was removed.`, registrationsRemoved: registrations ?? 0 });
}
