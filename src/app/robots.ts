import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/app',
        '/api/',
        '/login',
        '/signup',
        '/organizer/',
        '/forgot-password',
        '/reset-password',
        '/invite',
        '/check-in',
        '/volunteer/',
      ],
    },
  };
}
