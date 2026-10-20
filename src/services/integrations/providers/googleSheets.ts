import { isAllowedGoogleSheetsUrl, isAllowedGoogleRedirect } from '@/lib/security/urlValidator';

interface GoogleSheetsConfig {
  webhookUrl?: string;
}

interface EventPayload {
  name: string;
}

interface JobPayload {
  payload: Record<string, unknown>;
}

export const googleSheetsProvider = {
  process: async (job: JobPayload, event: EventPayload, config: GoogleSheetsConfig) => {
    if (!config || !config.webhookUrl) {
      throw new Error('Google Sheets webhook URL is missing.');
    }

    const validation = isAllowedGoogleSheetsUrl(config.webhookUrl);
    if (!validation.valid) {
      throw new Error(`Invalid Google Sheets webhook URL: ${validation.reason}`);
    }

    const { registrationNumber, attendee } = job.payload as {
      registrationNumber: string;
      attendee: { firstName: string; lastName?: string; email?: string; phone?: string };
    };

    const payload = {
      event_name: event.name,
      registration_number: registrationNumber,
      first_name: attendee?.firstName || '',
      last_name: attendee?.lastName || '',
      email: attendee?.email || '',
      phone: attendee?.phone || '',
      registered_at: new Date().toISOString(),
    };

    // Safe fetch with manual redirect inspection to prevent SSRF through redirects
    let targetUrl = config.webhookUrl.trim();
    let maxRedirects = 3;
    let res: Response | null = null;

    while (maxRedirects >= 0) {
      res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'manual',
      });

      // Handle redirects
      if ([301, 302, 307, 308].includes(res.status)) {
        const location = res.headers.get('location');
        if (!location || !isAllowedGoogleRedirect(location)) {
          throw new Error('SSRF blocked: Disallowed redirect destination from Google Apps Script.');
        }
        targetUrl = location;
        maxRedirects--;
        continue;
      }

      break;
    }

    if (!res || !res.ok) {
      throw new Error(`Webhook returned status ${res?.status}: ${res?.statusText}`);
    }

    return { success: true };
  },
};
