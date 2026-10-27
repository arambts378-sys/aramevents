import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';
import { qrCredentialsService } from '@/services/qrCredentials';

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHeader(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[\r\n\t]/g, ' ').trim();
}

function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !/[\r\n]/.test(email);
}

interface EventPayload {
  id: string;
  name: string;
  type?: string;
  date?: string;
  venue?: string;
}

interface EmailConfig {
  host: string;
  port: string;
  user: string;
  pass: string;
  fromEmail?: string;
  fromName?: string;
  subject?: string;
  customMessage?: string;
}

interface JobPayload {
  payload: Record<string, unknown>;
}

export const emailProvider = {
  process: async (job: JobPayload, event: EventPayload, config: EmailConfig) => {
    if (!config || !config.host) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { host, port, user, fromEmail, fromName, subject, customMessage } = config;
    let pass = config.pass;
    try {
      const { decryptSecret } = await import('@/utils/encryption');
      pass = decryptSecret(pass);
    } catch {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { registrationNumber, attendee } = job.payload as {
      registrationNumber: string;
      attendee: { firstName: string; email: string };
    };

    if (!attendee?.email || !isValidEmail(attendee.email)) {
      throw new Error('INVALID_RECIPIENT_EMAIL');
    }

    const transporter = nodemailer.createTransport({
      host: sanitizeHeader(host),
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465,
      auth: { user: sanitizeHeader(user), pass },
      connectionTimeout: 10000,
    });

    const safeFromName = sanitizeHeader(fromName || event.name);
    const safeFromEmail = sanitizeHeader(fromEmail || user);
    const safeSubject = sanitizeHeader(subject || `Registration Confirmed: ${event.name}`);
    const safeFirstName = escapeHtml(attendee.firstName);
    const safeEventName = escapeHtml(event.name);
    const safeRegNumber = escapeHtml(registrationNumber);
    const safeCustomMessage = escapeHtml(customMessage);

    const mailOptions = {
      from: `"${safeFromName}" <${safeFromEmail}>`,
      to: attendee.email.trim(),
      subject: safeSubject,
      text: `Hi ${attendee.firstName},\n\nYour registration for ${event.name} has been successfully confirmed.\nRegistration Number: ${registrationNumber}\nEvent: ${event.name}\n\n${customMessage || ''}\n\nBest regards,\nThe ${event.name} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border-radius: 8px; border: 1px solid #f3f4f6; color: #1f2937;">
          <h1 style="color: #4F46E5; margin-bottom: 20px;">Registration Confirmed!</h1>
          <p>Hi ${safeFirstName},</p>
          <p>Your registration for <strong>${safeEventName}</strong> has been successfully confirmed.</p>
          
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Registration Number:</strong> <span style="color: #4F46E5;">${safeRegNumber}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Event:</strong> ${safeEventName}</p>
          </div>

          ${safeCustomMessage ? `<p style="margin-bottom: 24px;">${safeCustomMessage}</p>` : ''}
          
          <p>We look forward to seeing you there!</p>
          <p>Best regards,<br>The ${safeEventName} Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  },

  sendQrDelivery: async (job: JobPayload, event: EventPayload, config: EmailConfig) => {
    if (!config || !config.host) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { host, port, user, fromEmail, fromName, subject, customMessage } = config;
    let pass = config.pass;
    try {
      const { decryptSecret } = await import('@/utils/encryption');
      pass = decryptSecret(pass);
    } catch {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { registrationId } = job.payload as {
      registrationId: string;
      registrationNumber?: string;
    };

    if (!registrationId) {
      throw new Error('registrationId is required for QR delivery');
    }

    // 1. Resolve active QR credential AND verified attendee details strictly from the database (L3)
    const supabase = createAdminClient();
    const { data: credential, error: credError } = await supabase
      .from('qr_credentials')
      .select(`
        *,
        registrations!inner(
          registration_number,
          distance_category_id,
          event_people!inner(
            people!inner(
              first_name,
              last_name,
              email
            )
          )
        )
      `)
      .eq('event_id', event.id)
      .eq('registration_id', registrationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (credError || !credential) {
      throw new Error('Active QR credential not found for this registration');
    }

    // Strictly enforce recipient email from database record (L3)
    const person = credential.registrations?.event_people?.[0]?.people;
    if (!person || !person.email || !isValidEmail(person.email)) {
      throw new Error('Verified attendee email not found in database');
    }

    const recipientEmail = person.email.trim();
    const attendeeFirstName = person.first_name || 'Attendee';
    const attendeeLastName = person.last_name || '';
    const registrationNumber = credential.registrations?.registration_number || 'N/A';

    // Fetch Distance Category for Walkathons
    let distanceCategoryName: string | null = null;
    if (event.type === 'Walkathon' && credential.registrations?.distance_category_id) {
      const { data: distData } = await supabase
        .from('walkathon_distance_categories')
        .select('name')
        .eq('id', credential.registrations.distance_category_id)
        .maybeSingle();
      if (distData) distanceCategoryName = distData.name;
    }

    // 2. Recover Raw Token securely
    const rawToken = qrCredentialsService.recoverRawToken(credential.id);

    // 3. Generate Ticket QR Code Image directly as Base64 PNG
    const qrDataUrl = await QRCode.toDataURL(rawToken, {
      type: 'image/png',
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 200,
      color: { dark: '#000000', light: '#ffffff' },
    });

    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');

    const eventDate = event?.date
      ? new Date(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Date TBA';
    const eventTime = event?.date
      ? new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : 'Time TBA';
    const venue = event?.venue || 'Venue TBA';

    const transporter = nodemailer.createTransport({
      host: sanitizeHeader(host),
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465,
      auth: { user: sanitizeHeader(user), pass },
      connectionTimeout: 10000,
    });

    const safeFromName = sanitizeHeader(fromName || event.name);
    const safeFromEmail = sanitizeHeader(fromEmail || user);
    const safeSubject = sanitizeHeader(subject || `Registration Confirmed — ${event.name}`);
    const safeFirstName = escapeHtml(attendeeFirstName);
    const safeLastName = escapeHtml(attendeeLastName);
    const safeEventName = escapeHtml(event.name);
    const safeRegNumber = escapeHtml(registrationNumber);
    const safeVenue = escapeHtml(venue);
    const safeEventDate = escapeHtml(eventDate);
    const safeEventTime = escapeHtml(eventTime);
    const safeDistanceCategory = escapeHtml(distanceCategoryName);
    const safeCustomMessage = escapeHtml(customMessage);

    const mailOptions = {
      from: `"${safeFromName}" <${safeFromEmail}>`,
      to: recipientEmail,
      subject: safeSubject,
      text: `Hello ${attendeeFirstName},\n\nYour registration for ${event.name} is confirmed.\nRegistration ID: ${registrationNumber}\nDate: ${eventDate} (${eventTime})\nVenue: ${venue}\n${distanceCategoryName ? `Distance: ${distanceCategoryName}\n` : ''}\n${customMessage || ''}\n\nPresent your attached ticket QR code at the event.\nRegards,\nThe ${event.name} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <div style="padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="color: #4F46E5; margin: 0 0 10px 0; font-size: 24px;">Registration Confirmed</h1>
              <p style="margin: 0; color: #4b5563; font-size: 16px;">Hello ${safeFirstName}, your registration for <strong>${safeEventName}</strong> is confirmed.</p>
            </div>

            <div style="padding: 30px; background-color: #ffffff;">
              <div style="border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #4F46E5; padding: 20px; text-align: center; color: white;">
                  <div style="font-size: 12px; font-weight: bold; letter-spacing: 2px; opacity: 0.8; margin-bottom: 5px;">Aram Events</div>
                  <div style="font-size: 22px; font-weight: 900;">${safeEventName}</div>
                </div>

                <div style="padding: 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                      <td width="50%" valign="top" style="padding-bottom: 15px;">
                        <div style="font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Attendee</div>
                        <div style="font-size: 16px; font-weight: bold; color: #111827;">${safeFirstName} ${safeLastName}</div>
                      </td>
                      <td width="50%" valign="top" style="padding-bottom: 15px;">
                        <div style="font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Registration ID</div>
                        <div style="font-size: 14px; font-family: monospace; font-weight: bold; color: #4F46E5;">${safeRegNumber}</div>
                      </td>
                    </tr>
                    <tr>
                      <td width="50%" valign="top" style="padding-bottom: 15px;">
                        <div style="font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Date</div>
                        <div style="font-size: 14px; font-weight: 600; color: #111827;">${safeEventDate}</div>
                        <div style="font-size: 12px; color: #6b7280;">${safeEventTime}</div>
                      </td>
                      <td width="50%" valign="top" style="padding-bottom: 15px;">
                        <div style="font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Venue</div>
                        <div style="font-size: 14px; font-weight: 600; color: #111827;">${safeVenue}</div>
                      </td>
                    </tr>
                    ${safeDistanceCategory ? `
                    <tr>
                      <td colspan="2" valign="top" style="padding: 12px; background-color: #f3f4ff; border-radius: 8px;">
                        <div style="font-size: 11px; font-weight: bold; color: #4F46E5; text-transform: uppercase; margin-bottom: 4px;">Distance</div>
                        <div style="font-size: 18px; font-weight: 900; color: #111827;">${safeDistanceCategory}</div>
                      </td>
                    </tr>
                    ` : ''}
                  </table>

                  <div style="text-align: center; margin-top: 25px; padding-top: 25px; border-top: 1px dashed #d1d5db;">
                    <img src="cid:event_ticket_qr" alt="QR Code" width="160" height="160" style="display: inline-block; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px;" />
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280; font-weight: 600;">Present this ticket at the event.</p>
                  </div>
                </div>
              </div>
            </div>

            <div style="padding: 0 30px 30px 30px; text-align: center;">
              ${safeCustomMessage ? `<p style="margin-bottom: 20px; font-size: 14px; color: #4b5563;">${safeCustomMessage}</p>` : ''}
              <p style="margin: 0; font-size: 14px; color: #9ca3af;">Regards,<br>The ${safeEventName} Team</p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `qr-${registrationNumber}.png`,
          content: qrBase64,
          encoding: 'base64',
          cid: 'event_ticket_qr',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  },

  sendScannerAccess: async (config: EmailConfig, event: EventPayload, sessionData: Record<string, unknown>) => {
    if (!config || !config.host) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { host, port, user, fromEmail, fromName, subject } = config;
    let pass = config.pass;
    try {
      const { decryptSecret } = await import('@/utils/encryption');
      pass = decryptSecret(pass);
    } catch {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { volunteerEmail, scannerLink, allowedZones, allowedDistances, expiresAt } = sessionData as {
      volunteerEmail: string;
      scannerLink: string;
      allowedZones: string[];
      allowedDistances: string[];
      expiresAt: string;
    };

    if (!volunteerEmail || !isValidEmail(volunteerEmail)) {
      throw new Error('INVALID_VOLUNTEER_EMAIL');
    }

    const transporter = nodemailer.createTransport({
      host: sanitizeHeader(host),
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465,
      auth: { user: sanitizeHeader(user), pass },
      connectionTimeout: 10000,
    });

    const safeFromName = sanitizeHeader(fromName || event.name);
    const safeFromEmail = sanitizeHeader(fromEmail || user);
    const safeSubject = sanitizeHeader(subject || `Scanner Access — ${event.name}`);
    const safeEventName = escapeHtml(event.name);
    const safeScannerLink = escapeHtml(scannerLink);
    const safeZones = (allowedZones || []).map(escapeHtml).join(', ');
    const safeDistances = (allowedDistances && allowedDistances.length > 0)
      ? allowedDistances.map(escapeHtml).join(', ')
      : 'All Participants';
    const safeExpires = expiresAt ? escapeHtml(new Date(expiresAt).toLocaleString()) : '';

    const mailOptions = {
      from: `"${safeFromName}" <${safeFromEmail}>`,
      to: volunteerEmail.trim(),
      subject: safeSubject,
      text: `You have been granted scanner access for ${event.name}.\nAllowed Zones: ${safeZones}\nAllowed Distances: ${safeDistances}\n${safeExpires ? `Expires: ${safeExpires}\n` : ''}\nOpen Scanner Link: ${scannerLink}\n\nSECURITY WARNING: Do not share this link with anyone.\nRegards,\nThe ${event.name} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <div style="padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="color: #4F46E5; margin: 0 0 10px 0; font-size: 24px;">Event Scanner Access</h1>
              <p style="margin: 0; color: #4b5563; font-size: 16px;">You have been granted scanner access for <strong>${safeEventName}</strong>.</p>
            </div>

            <div style="padding: 30px;">
              <p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Allowed Zones:</strong> ${safeZones}</p>
              <p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Allowed Distances:</strong> ${safeDistances}</p>
              ${safeExpires ? `<p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Expires:</strong> ${safeExpires}</p>` : ''}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${safeScannerLink}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px;">Open Scanner</a>
              </div>
            </div>

            <div style="padding: 0 30px 30px 30px; text-align: center;">
              <p style="margin-bottom: 20px; font-size: 14px; color: #ef4444; font-weight: bold;">SECURITY WARNING: Do not share this link with anyone. It provides direct scanning authorization without a password.</p>
              <p style="margin: 0; font-size: 14px; color: #9ca3af;">Regards,<br>The ${safeEventName} Team</p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  },

  sendCertificateDelivery: async (job: JobPayload, event: EventPayload, config: EmailConfig) => {
    if (!config || !config.host) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { host, port, user, fromEmail, fromName } = config;
    let pass = config.pass;
    try {
      const { decryptSecret } = await import('@/utils/encryption');
      pass = decryptSecret(pass);
    } catch {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { certificateNumber, name, email, distance, certificateUrl } = job.payload as {
      certificateNumber: string;
      name: string;
      email: string;
      distance: string;
      certificateUrl: string;
    };

    if (!email || !isValidEmail(email)) {
      throw new Error('INVALID_CERTIFICATE_RECIPIENT_EMAIL');
    }

    const supabase = createAdminClient();
    const { data: fileData, error: dlError } = await supabase.storage.from('certificates').download(certificateUrl);

    if (dlError || !fileData) {
      throw new Error('Failed to download certificate image');
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const transporter = nodemailer.createTransport({
      host: sanitizeHeader(host),
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465,
      auth: { user: sanitizeHeader(user), pass },
      connectionTimeout: 10000,
    });

    const safeFromName = sanitizeHeader(fromName || event.name);
    const safeFromEmail = sanitizeHeader(fromEmail || user);
    const safeSubject = sanitizeHeader(`Your Certificate of Participation — ${event.name}`);
    const safeName = escapeHtml(name);
    const safeEventName = escapeHtml(event.name);
    const safeDistance = escapeHtml(distance);
    const safeCertNumber = escapeHtml(certificateNumber);

    const mailOptions = {
      from: `"${safeFromName}" <${safeFromEmail}>`,
      to: email.trim(),
      subject: safeSubject,
      text: `Hi ${name},\n\nCongratulations on successfully participating in the ${event.name} ${distance} Category.\nCertificate Number: ${certificateNumber}\n\nPlease find your official certificate attached to this email.\n\nBest regards,\nThe ${event.name} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border-radius: 8px; border: 1px solid #f3f4f6; color: #1f2937;">
          <h1 style="color: #4F46E5; margin-bottom: 20px;">Certificate Ready!</h1>
          <p>Hi ${safeName},</p>
          <p>Congratulations on successfully participating in the <strong>${safeEventName}</strong> ${safeDistance} Category.</p>
          
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Certificate Number:</strong> <span style="color: #4F46E5;">${safeCertNumber}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Distance:</strong> ${safeDistance}</p>
          </div>

          <p>Please find your official certificate attached to this email.</p>
          
          <p>Best regards,<br>The ${safeEventName} Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `${safeCertNumber}.png`,
          content: buffer,
          contentType: 'image/png',
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    await supabase
      .from('certificate_issuances')
      .update({ email_status: 'sent' })
      .eq('certificate_number', certificateNumber);

    return { success: true };
  },
};
