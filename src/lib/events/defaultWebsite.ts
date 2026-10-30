import type { WebsiteConfig } from '@/types';

/** The draft website every new event starts with. The flyer, when given, becomes the hero banner. */
export function buildDefaultWebsite({ flyerUrl, format }: { flyerUrl?: string; format: string }): WebsiteConfig {
  return {
    status: 'draft',
    draft: {
      templateId: 'editorial',
      status: 'draft',
      theme: {},
      sections: [
        { id: 'header', type: 'header', visible: true, order: 0 },
        {
          id: 'hero',
          type: 'hero',
          visible: true,
          order: 1,
          content: flyerUrl ? { image: flyerUrl, layout: 'banner', showEventInfo: false } : {},
        },
        { id: 'event_info', type: 'event_info', visible: true, order: 2 },
        { id: 'about', type: 'about', visible: true, order: 3 },
        { id: 'speakers', type: 'speakers', visible: false, order: 4 },
        { id: 'agenda', type: 'agenda', visible: false, order: 5 },
        { id: 'register', type: 'register', visible: true, order: 6 },
        { id: 'venue', type: 'venue', visible: format !== 'Virtual', order: 7 },
        { id: 'sponsors', type: 'sponsors', visible: false, order: 8 },
        { id: 'exhibitors', type: 'exhibitors', visible: false, order: 9 },
        { id: 'contact', type: 'contact', visible: true, order: 10 },
        { id: 'final_cta', type: 'final_cta', visible: true, order: 11 },
        { id: 'footer', type: 'footer', visible: true, order: 12 },
      ],
    },
  };
}

/** URL slug from an event name; names without latin letters or digits fall back to "event". */
export function buildEventSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'event';
  return `${base}-${Math.random().toString(36).substring(2, 6)}`;
}
