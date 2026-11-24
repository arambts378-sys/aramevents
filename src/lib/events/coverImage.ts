type Section = { type?: string; content?: { image?: unknown } | null };
type Page = { sections?: Section[] | null } | null | undefined;

const isUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v.trim());

function imageFrom(page: Page): string | null {
  const sections = Array.isArray(page?.sections) ? page!.sections! : [];
  const hero = sections.find((s) => s?.type === 'hero' && isUrl(s.content?.image));
  if (hero) return (hero.content!.image as string).trim();
  const any = sections.find((s) => isUrl(s?.content?.image));
  return any ? (any.content!.image as string).trim() : null;
}

/**
 * The picture to show for an event in lists: the uploaded flyer, else the image the organizer put
 * on the event website (hero first, published version before the draft).
 */
export function eventCoverImage(flyerUrl: string | null | undefined, website: unknown): string | null {
  if (isUrl(flyerUrl)) return flyerUrl.trim();
  const site = (website ?? null) as { published?: Page; draft?: Page } | null;
  return imageFrom(site?.published) ?? imageFrom(site?.draft);
}
