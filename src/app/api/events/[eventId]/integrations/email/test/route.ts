import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';
import { isSafeSmtpHost, isValidSmtpPort } from '@/lib/security/smtpValidator';
import { decryptSecret } from '@/utils/encryption';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { host, port, user, pass, fromName, fromEmail, testEmail } = body;

    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate Event Access / Workspace Role (events.update required)
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('workspace_id')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    const { data: hasPerm } = await supabase.rpc('has_permission', {
      p_workspace_id: eventData.workspace_id,
      p_permission_name: 'events.update'
    });

    if (!hasPerm) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // 3. SSRF Protection: Validate Host and Port
    const hostValidation = isSafeSmtpHost(host);
    if (!hostValidation.safe) {
      return NextResponse.json({ success: false, message: hostValidation.reason || 'Invalid SMTP host.' }, { status: 400 });
    }

    const parsedPort = parseInt(port, 10);
    if (!isValidSmtpPort(parsedPort)) {
      return NextResponse.json({ success: false, message: 'Invalid SMTP port. Allowed ports are 25, 465, 587, 2525.' }, { status: 400 });
    }

    // 4. Resolve password: NEVER send stored credentials to an altered destination (H4)
    let finalPassword = pass;
    const normHost = (host || '').trim().toLowerCase();
    const normUser = (user || '').trim().toLowerCase();

    if (!finalPassword || finalPassword.trim() === '') {
      const { data: existingIntegration } = await supabase
        .from('event_integrations')
        .select('config')
        .eq('event_id', eventId)
        .eq('provider', 'email')
        .maybeSingle();

      const existingHost = (existingIntegration?.config?.host || '').trim().toLowerCase();
      const existingUser = (existingIntegration?.config?.user || '').trim().toLowerCase();

      // If the user did not provide a password, the host and user MUST match the saved config
      if (normHost !== existingHost || normUser !== existingUser) {
        return NextResponse.json({
          success: false,
          message: 'Password is required when testing a different SMTP host or username.',
        }, { status: 400 });
      }

      if (existingIntegration?.config?.pass) {
        try {
          finalPassword = decryptSecret(existingIntegration.config.pass);
        } catch {
          return NextResponse.json({ success: false, message: 'Existing password could not be decrypted.' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ success: false, message: 'Password is required to test the connection.' }, { status: 400 });
      }
    }

    // 5. Create Transporter with connection timeout
    const transporter = nodemailer.createTransport({
      host: normHost,
      port: parsedPort,
      secure: parsedPort === 465,
      auth: {
        user: normUser,
        pass: finalPassword
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    });

    // 6. Test connection
    try {
      await transporter.verify();
    } catch {
      return NextResponse.json({ success: false, message: 'Unable to connect to the email server. Check credentials.' }, { status: 400 });
    }

    // 7. Optionally send a test email
    if (testEmail) {
      try {
        await transporter.sendMail({
          from: `"${fromName || 'ARAM BTS'}" <${fromEmail}>`,
          to: testEmail,
          subject: 'ARAM BTS Email Configuration Test',
          text: 'Your ARAM BTS email configuration is working correctly.\n\nThis is a test email.',
          html: '<p>Your ARAM BTS email configuration is working correctly.</p><p>This is a test email.</p>'
        });
      } catch {
        return NextResponse.json({ success: false, message: 'Connected, but failed to send test email.' }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: 'Email connection verified.' });

  } catch (error: any) {
    console.error('Error in email test API:', error?.message || error);
    return NextResponse.json({ success: false, message: 'Unable to complete email test.' }, { status: 500 });
  }
}
