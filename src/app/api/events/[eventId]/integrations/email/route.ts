import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptSecret } from '@/utils/encryption';
import { isSafeSmtpHost, isValidSmtpPort } from '@/lib/security/smtpValidator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate Event Access / Workspace Role (events.update required to read integration settings)
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('workspace_id')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const { data: hasPerm } = await supabase.rpc('has_permission', {
      p_workspace_id: eventData.workspace_id,
      p_permission_name: 'events.update',
    });

    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: existingIntegration } = await supabase
      .from('event_integrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('provider', 'email')
      .maybeSingle();

    if (!existingIntegration) {
      return NextResponse.json({ configured: false });
    }

    const config = existingIntegration.config || {};

    // Secrets (pass) are strictly omitted from client responses
    return NextResponse.json({
      configured: true,
      active: existingIntegration.is_active,
      host: config.host || '',
      port: config.port || '587',
      encryption: config.encryption || 'tls',
      user: config.user || '',
      fromName: config.fromName || '',
      fromEmail: config.fromEmail || '',
      replyTo: config.replyTo || '',
      subject: config.subject || '',
      customMessage: config.customMessage || '',
      hasPassword: Boolean(config.pass),
    });
  } catch (error: any) {
    console.error('Error fetching email integration:', error?.message || error);
    return NextResponse.json({ error: 'Failed to load email integration.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { host, port, user, pass, encryption, fromName, fromEmail, replyTo, active, subject, customMessage } = body;

    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate Event Access / Workspace Role
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('workspace_id')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const { data: hasPerm } = await supabase.rpc('has_permission', {
      p_workspace_id: eventData.workspace_id,
      p_permission_name: 'events.update',
    });

    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. SSRF Protection: Validate Host and Port
    const hostValidation = isSafeSmtpHost(host);
    if (!hostValidation.safe) {
      return NextResponse.json({ error: hostValidation.reason || 'Invalid SMTP host.' }, { status: 400 });
    }

    if (port && !isValidSmtpPort(port)) {
      return NextResponse.json({ error: 'Invalid SMTP port. Allowed ports are 25, 465, 587, 2525.' }, { status: 400 });
    }

    // 4. Load existing config
    const { data: existingIntegration } = await supabase
      .from('event_integrations')
      .select('config')
      .eq('event_id', eventId)
      .eq('provider', 'email')
      .maybeSingle();

    let finalPassword = '';
    const normHost = (host || '').trim().toLowerCase();
    const normUser = (user || '').trim().toLowerCase();
    const existingHost = (existingIntegration?.config?.host || '').trim().toLowerCase();
    const existingUser = (existingIntegration?.config?.user || '').trim().toLowerCase();

    if (pass && pass.trim() !== '') {
      // New password provided, encrypt it
      finalPassword = encryptSecret(pass);
    } else {
      // User did not provide password. Prevent exfiltration across destinations (H4).
      if (!existingIntegration?.config?.pass) {
        return NextResponse.json({ error: 'Password is required for new configurations.' }, { status: 400 });
      }

      // If host or username changed, force password re-entry
      if (normHost !== existingHost || normUser !== existingUser) {
        return NextResponse.json(
          { error: 'Password must be re-entered when changing SMTP host or username.' },
          { status: 400 }
        );
      }

      finalPassword = existingIntegration.config.pass;
    }

    const finalConfig = {
      host: normHost,
      port: String(port || '587'),
      encryption: encryption || 'tls',
      user: normUser,
      pass: finalPassword,
      fromName: fromName || '',
      fromEmail: fromEmail || '',
      replyTo: replyTo || '',
      subject: subject || '',
      customMessage: customMessage || '',
    };

    const { data: savedData, error: upsertError } = await supabase
      .from('event_integrations')
      .upsert(
        {
          event_id: eventId,
          provider: 'email',
          config: finalConfig,
          is_active: active !== undefined ? active : true,
        },
        { onConflict: 'event_id,provider' }
      )
      .select('*')
      .single();

    if (upsertError) {
      throw upsertError;
    }

    // 5. Return sanitized config (never return stored password)
    return NextResponse.json({
      configured: true,
      provider: 'email',
      active: savedData.is_active,
      host: finalConfig.host,
      port: finalConfig.port,
      encryption: finalConfig.encryption,
      user: finalConfig.user,
      fromName: finalConfig.fromName,
      fromEmail: finalConfig.fromEmail,
      replyTo: finalConfig.replyTo,
      subject: finalConfig.subject,
      customMessage: finalConfig.customMessage,
      hasPassword: true,
    });
  } catch (error: any) {
    console.error('Error saving email integration:', error?.message || error);
    return NextResponse.json({ error: 'Failed to save email integration.' }, { status: 500 });
  }
}
