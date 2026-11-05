/**
 * Turns Supabase Auth's email rate-limit errors into a message that says when to retry.
 *
 * Supabase returns no retry time. Two limits share the `over_email_send_rate_limit` code:
 * - per address: "…you can only request this after 42 seconds." (the wait is in the text)
 * - per project: "email rate limit exceeded" — a rolling hourly cap on all auth emails.
 *   Every email sent more than an hour ago has left the window, so one hour after the most
 *   recent auth email is a safe upper bound on when sending works again.
 */

const HOUR = 3_600_000;

interface AuthErrorLike {
  code?: string;
  status?: number;
  message?: string;
}

function inMinutes(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return minutes === 1 ? 'about a minute' : `about ${minutes} minutes`;
}

export function isEmailRateLimit(error: AuthErrorLike | null | undefined) {
  if (!error) return false;
  return error.code === 'over_email_send_rate_limit' || /email rate limit|only request this after/i.test(error.message || '');
}

export function emailRateLimitMessage(error: AuthErrorLike, recentSends: (string | null | undefined)[], now = Date.now()) {
  const seconds = /after (\d+) seconds?/i.exec(error.message || '');
  if (seconds) {
    return `An email was just sent to this address. Try again in ${seconds[1]} seconds.`;
  }

  const latest = Math.max(0, ...recentSends.map((s) => (s ? Date.parse(s) : 0)).filter((t) => !Number.isNaN(t)));
  const wait = latest + HOUR - now;
  const when = wait > 0 ? `in ${inMinutes(wait)}` : 'in a few minutes';
  return `Too many emails have been sent recently. Try again ${when}.`;
}
