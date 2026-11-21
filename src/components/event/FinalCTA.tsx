import Link from "next/link";
import { ConcertFinalCTA } from "./concert/ConcertSections";

export default function FinalCTA({ event, section, variant }: any) {
  if (variant === "concert") return <ConcertFinalCTA event={event} section={section} />;
  const content = section?.content || {};
  const title = content.title || "Ready to shape the future?";
  
  const showPrimaryCta = content.showPrimaryCta ?? true;
  const primaryCtaText = content.primaryCtaText || "Register Now";
  const primaryCtaDest = content.primaryCtaDest || `/events/${event?.slug || event?.id}/register`;
  
  const showSecondaryCta = content.showSecondaryCta ?? false;
  const secondaryCtaText = content.secondaryCtaText || "View Agenda";
  const secondaryCtaDest = content.secondaryCtaDest || "#agenda";
  return (
    <section className="bg-brand-maroon website-section">
      <div className="max-w-7xl mx-auto px-4 @min-[40rem]:px-6 @min-[64rem]:px-8 text-center">
        <h2 className="text-4xl @min-[48rem]:text-5xl @min-[64rem]:text-7xl font-medium text-brand-white leading-tight tracking-tight mb-6">
          {title}
        </h2>
        <p className="text-xl @min-[48rem]:text-2xl text-brand-cream/80 mb-8 max-w-2xl mx-auto font-light">
          Join {event?.name} and be part of this amazing experience.
        </p>
        
        <div className="flex flex-col @min-[40rem]:flex-row justify-center items-center space-y-4 @min-[40rem]:space-y-0 @min-[40rem]:space-x-6">
          {showPrimaryCta && (
            <Link
              href={primaryCtaDest}
              className="inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-brand-maroon bg-brand-white hover:bg-brand-soft transition-colors shadow-lg hover:shadow-xl rounded-sm w-full @min-[40rem]:w-auto"
            >
              {primaryCtaText}
            </Link>
          )}
          
          {showSecondaryCta && (
            <Link
              href={secondaryCtaDest}
              className="inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-brand-white border border-brand-white hover:bg-brand-white/10 transition-colors shadow-lg hover:shadow-xl rounded-sm w-full @min-[40rem]:w-auto"
            >
              {secondaryCtaText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
