/** Canonical public origin. www.aram.events and other hosts redirect here (see middleware). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://aram.events').replace(/\/+$/, '');

export const SITE_HOST = new URL(SITE_URL).host;

/** Hosts that should permanently redirect to SITE_HOST. */
export const REDIRECT_HOSTS = [`www.${SITE_HOST}`];

export const SITE_NAV = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/security', label: 'Security' },
  { href: '/contact', label: 'Contact' },
] as const;

export const CONTACT_TOPICS = ['Getting started', 'Plans and pricing', 'Support', 'Security', 'Something else'] as const;
