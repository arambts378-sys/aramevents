import { timingSafeEqual } from 'node:crypto';

export type CronAuthorizationResult = 'authorized' | 'unauthorized' | 'misconfigured';

export function checkCronAuthorization(
  authorizationHeader: string | null,
  cronSecret: string | undefined
): CronAuthorizationResult {
  if (!cronSecret) return 'misconfigured';
  if (!authorizationHeader?.startsWith('Bearer ')) return 'unauthorized';

  const supplied = Buffer.from(authorizationHeader.slice(7));
  const expected = Buffer.from(cronSecret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return 'unauthorized';
  }

  return 'authorized';
}
