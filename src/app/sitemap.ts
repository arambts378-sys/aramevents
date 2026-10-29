import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

const PAGES = ['', '/pricing', '/contact', '/about', '/privacy', '/terms'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
