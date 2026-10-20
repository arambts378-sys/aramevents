"use server";

import { registrationsService } from '@/services/registrations';
import { processRegistrationIntegrationJobs } from '@/services/integrations/processor';
import { qrCredentialsService } from '@/services/qrCredentials';

import { createAdminClient } from '@/lib/supabase/admin';
import { getActivityCorrelationId, recordPlatformActivity, resolveActivityWorkspace } from '@/services/platformActivity.server';

export async function submitRegistrationServerAction(
  eventId: string,
  personData: {
    first_name: string;
    last_name?: string;
    email: string;
    phone?: string;
    organization?: string;
    job_title?: string;
    distance_category_id?: string;
    ticket_type_id?: string;
    quantity?: number;
    gender?: string;
    age?: string;
    t_shirt_size?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }
) {
  try {
    // 1. Submit Registration (creates records + initial jobs in DB)
    const result = await registrationsService.submitPublicRegistration(eventId, personData);
    if (!result.success) {
      await recordPlatformActivity({
        workspaceId: await resolveActivityWorkspace(eventId),
        action: 'registration.failed',
        resourceType: 'event',
        resourceId: eventId,
        outcome: 'failure',
        errorCode: 'REGISTRATION_FAILED',
        correlationId: getActivityCorrelationId(),
      });
    }

    let qrToken = undefined;
    let emailDeliveryFailed = false;

    if (result.success && result.registration_id) {
      // 2. Synchronously Generate QR Credential
      // This is a strict requirement for the frontend to render the ticket.
      // We do not wrap this in a catch block because if it fails, the registration is technically incomplete 
      // (the user can't check in), but wait, the user's registration IS in the database.
      // If generateQrCredential fails because it already exists, it will throw. We should catch and try to get it.
      let credential;
      try {
        credential = await qrCredentialsService.getQrCredential(result.registration_id);
        if (!credential) {
          const genResult = await qrCredentialsService.generateQrCredential(eventId, result.registration_id, true);
          credential = genResult.credential;
        }
      } catch (error) {
        await recordPlatformActivity({
          workspaceId: await resolveActivityWorkspace(eventId),
          action: 'ticket.generation_failed',
          resourceType: 'registration',
          resourceId: result.registration_id,
          outcome: 'failure',
          errorCode: 'TICKET_GENERATION_FAILED',
          correlationId: getActivityCorrelationId(),
        });
        throw error;
      }
      
      if (credential) {
        qrToken = qrCredentialsService.recoverRawToken(credential.id, credential.credential_token_hash);
      } else {
        await recordPlatformActivity({
          workspaceId: await resolveActivityWorkspace(eventId),
          action: 'ticket.generation_failed',
          resourceType: 'registration',
          resourceId: result.registration_id,
          outcome: 'failure',
          errorCode: 'TICKET_GENERATION_FAILED',
          correlationId: getActivityCorrelationId(),
        });
      }

      // 3. Queue Email Delivery if enabled
      try {
        const supabase = createAdminClient();
        const { data: integrations } = await supabase
          .from('event_integrations')
          .select('provider')
          .eq('event_id', eventId)
          .eq('provider', 'email')
          .eq('is_active', true)
          .maybeSingle();

        if (integrations) {
          const payload = {
            registrationId: result.registration_id,
            registrationNumber: result.registration_number,
            attendee: {
              firstName: personData.first_name,
              lastName: personData.last_name,
              email: personData.email,
              phone: personData.phone
            }
          };
          
          const idempotencyKey = `${eventId}:${result.registration_id}:email:qr_delivery`;
          
          await supabase.from('integration_jobs').insert({
            event_id: eventId,
            registration_id: result.registration_id,
            provider: 'email',
            event_type: 'qr_delivery',
            payload: payload,
            idempotency_key: idempotencyKey,
            next_attempt_at: new Date().toISOString()
          }).select('*').maybeSingle(); // This will safely fail on conflict (duplicate) due to idempotency_key

          // Try to process immediately
          await processRegistrationIntegrationJobs(result.registration_id);
        }
      } catch (emailErr) {
        await recordPlatformActivity({
          workspaceId: await resolveActivityWorkspace(eventId),
          action: 'integration.delivery_failed',
          resourceType: 'registration',
          resourceId: result.registration_id,
          outcome: 'failure',
          errorCode: 'EMAIL_DELIVERY_FAILED',
          correlationId: getActivityCorrelationId(),
          metadata: { provider: 'email', eventType: 'qr_delivery' },
        });
        console.error("Email queuing/processing failed", emailErr);
        emailDeliveryFailed = true;
      }
    }

    return {
      ...result,
      qrToken,
      emailDeliveryFailed
    };
  } catch (error: any) {
    await recordPlatformActivity({
      workspaceId: await resolveActivityWorkspace(eventId),
      action: 'registration.failed',
      resourceType: 'event',
      resourceId: eventId,
      outcome: 'failure',
      errorCode: 'REGISTRATION_FAILED',
      correlationId: getActivityCorrelationId(),
    });
    throw new Error(error.message || 'Registration failed');
  }
}
