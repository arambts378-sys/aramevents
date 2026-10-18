export function isPublicRegistrationEnabled(
  settings: { is_enabled: boolean } | null | undefined
): boolean {
  return settings?.is_enabled === true;
}
