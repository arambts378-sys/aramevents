export type PlatformAccessDecision = 'unauthenticated' | 'allowed' | 'denied';

export async function resolvePlatformConsoleAccess(
  userId: string | null,
  lookup: () => Promise<{ data: boolean | null; error: { message?: string } | null }>,
): Promise<PlatformAccessDecision> {
  if (!userId) return 'unauthenticated';

  try {
    const { data, error } = await lookup();
    if (error) {
      console.error('Failed to verify platform console permission:', error);
      return 'denied';
    }
    return data === true ? 'allowed' : 'denied';
  } catch (error) {
    console.error('Failed to verify platform console permission:', error);
    return 'denied';
  }
}
