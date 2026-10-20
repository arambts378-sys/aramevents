/**
 * Validates Google Sheets webhook destinations to prevent SSRF.
 */
export function isAllowedGoogleSheetsUrl(urlStr: string | null | undefined): { valid: boolean; reason?: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { valid: false, reason: 'Webhook URL is required.' };
  }

  try {
    const parsed = new URL(urlStr.trim());

    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Only HTTPS protocol is permitted.' };
    }

    if (parsed.port && parsed.port !== '443' && parsed.port !== '') {
      return { valid: false, reason: 'Custom ports are not permitted.' };
    }

    if (parsed.hostname.toLowerCase() !== 'script.google.com') {
      return { valid: false, reason: 'Webhook URL must be hosted on script.google.com.' };
    }

    if (!/^\/macros\/s\/[a-zA-Z0-9_\-]+\/exec$/.test(parsed.pathname)) {
      return {
        valid: false,
        reason: 'Webhook URL must follow standard Google Apps Script deployment format (/macros/s/<id>/exec).',
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format.' };
  }
}

/**
 * Validates redirect URLs to ensure they remain within Google's approved execution domains.
 */
export function isAllowedGoogleRedirect(location: string): boolean {
  try {
    const parsed = new URL(location);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'script.google.com' || host === 'script.googleusercontent.com';
  } catch {
    return false;
  }
}
