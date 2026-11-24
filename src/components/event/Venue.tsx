import { EventData } from "@/types/event";
import { VenueVariant } from "@/data/templates";
import Link from "next/link";
import { ConcertVenue } from "./concert/ConcertSections";
import { VenueMap, hasMappableVenue, venueMapLinks } from "./VenueMap";

interface VenueProps {
  event: EventData;
  section?: any;
  variant?: VenueVariant;
}

export default function Venue({ event, section, variant = "split" }: VenueProps) {
  if (variant === "concert") return <ConcertVenue event={event} section={section} />;
  const content = section?.content || {};
  // The address from the event details. Venue and location often hold the same text, so don't repeat it.
  const venueName = (event.venue || "").trim();
  const locationText = (event.location || "").trim();
  const address = venueName && locationText && !venueName.includes(locationText) && !locationText.includes(venueName)
    ? `${venueName}, ${locationText}`
    : venueName.length >= locationText.length ? venueName : locationText;
  const mapQuery = (typeof content.mapQuery === "string" && content.mapQuery.trim()) || address;
  const showMap = (content.showMap ?? true) && hasMappableVenue(address);
  const eventSlug = (event as { slug?: string }).slug;
  const mapUrl = venueMapLinks(mapQuery).directions;
  // The organizer's own venue photo, if they uploaded one in the editor.
  const photo = typeof content.image === "string" && content.image.trim() ? content.image : null;
  const imageUrl = photo || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2070&auto=format&fit=crop";

  return (
    <section id="venue" className="bg-brand-white website-section border-t border-brand-border/60">
      <div className="max-w-7xl mx-auto px-4 @min-[40rem]:px-6 @min-[64rem]:px-8">
        
        {/* VARIANT: IMMERSIVE (Summit / Cinematic full-bleed venue banner) */}
        {variant === "immersive" && (
          <div className="relative rounded-2xl overflow-hidden min-h-[340px] flex items-end p-6 @min-[48rem]:p-12 shadow-lg">
            <img
              src={imageUrl}
              alt="Venue"
              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.45] contrast-110"
            />
            <div className="relative z-10 max-w-2xl text-white">
              <span className="text-xs font-mono uppercase tracking-widest text-brand-maroon font-bold bg-white/90 px-2.5 py-1 rounded inline-block mb-4">
                Destination Venue
              </span>
              <h2 className="text-3xl @min-[48rem]:text-5xl font-bold leading-tight mb-4">
                {content.title || event.venue || "Official Venue"}
              </h2>
              <p className="text-lg text-white/80 mb-6 max-w-xl">
                {content.description || `Experience ${event.name} in the heart of ${event.location}. An extraordinary destination tailored for global collaboration.`}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-mono text-white/70">
                  📍 {event.location}
                </span>
                {showMap && (
                  <Link
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-white text-brand-dark text-xs font-bold font-mono uppercase hover:bg-brand-maroon hover:text-white transition-colors"
                  >
                    <span>Google Maps</span>
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
        {variant === "immersive" && showMap && (
          <VenueMap query={mapQuery} label={address} photo={photo} slug={eventSlug} className="mt-6 h-[360px] rounded-2xl border border-brand-border" />
        )}

        {/* VARIANT: EDITORIAL (High-fashion architecture feature) */}
        {variant === "editorial" && (
          <div className="space-y-10">
            <div className="max-w-3xl border-b border-brand-border pb-8">
              <span className="text-xs font-mono text-brand-maroon uppercase tracking-widest font-semibold block mb-2">
                // Architecture &amp; Setting
              </span>
              <h2 className="text-3xl @min-[48rem]:text-5xl font-serif text-brand-dark leading-tight">
                {content.title || event.venue || "Event Venue"}
              </h2>
            </div>

            <div className="grid grid-cols-1 @min-[64rem]:grid-cols-12 gap-8 items-start">
              {showMap ? (
                <VenueMap query={mapQuery} label={address} photo={photo} slug={eventSlug} className="@min-[64rem]:col-span-8 w-full h-[320px] @min-[48rem]:h-[420px] rounded-xl border border-brand-border" />
              ) : (
                <div className="@min-[64rem]:col-span-8 aspect-[16/9] rounded-xl overflow-hidden bg-brand-soft border border-brand-border">
                  <img src={imageUrl} alt="Venue architecture" className="w-full h-full object-cover filter grayscale contrast-115" />
                </div>
              )}
              <div className="@min-[64rem]:col-span-4 bg-brand-soft border border-brand-border p-6 rounded-xl space-y-6">
                <div>
                  <span className="text-[11px] font-mono uppercase text-brand-muted block mb-1">ADDRESS</span>
                  <div className="text-xl font-serif text-brand-dark">{address || "Venue to be announced"}</div>
                </div>
                {content.description && (
                  <p className="text-sm text-brand-muted leading-relaxed pt-4 border-t border-brand-border">
                    {content.description}
                  </p>
                )}
                {showMap && (
                  <Link
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center w-full py-2.5 border border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-colors text-xs font-mono uppercase tracking-wider font-bold rounded"
                  >
                    Directions &amp; Map
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VARIANT: COMPACT (Workshop / Quick practical row card) */}
        {variant === "compact" && (
          <div className="bg-brand-soft border border-brand-border rounded-2xl p-6 @min-[48rem]:p-8 flex flex-col @min-[48rem]:flex-row items-center gap-8">
            {showMap ? (
              <VenueMap query={mapQuery} label={address} photo={photo} slug={eventSlug} className="w-full @min-[48rem]:w-80 h-56 rounded-xl shrink-0" />
            ) : (
              <div className="w-full @min-[48rem]:w-64 h-44 rounded-xl overflow-hidden bg-brand-border shrink-0">
                <img src={imageUrl} alt="Venue location" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 space-y-2 text-left">
              <span className="text-xs font-mono uppercase text-brand-maroon font-bold tracking-wider">
                Event Location &amp; Directions
              </span>
              <h3 className="text-2xl font-bold text-brand-dark">
                {event.venue || event.location}
              </h3>
              <p className="text-sm text-brand-muted">
                {content.description || `In-person sessions held in ${event.location}. Full transit and check-in instructions provided after registration.`}
              </p>
              <div className="pt-3 flex items-center gap-4">
                <span className="text-xs font-mono text-brand-dark">📍 {event.location}</span>
                {showMap && (
                  <Link
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-brand-maroon hover:underline font-bold"
                  >
                    View Map →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VARIANT: MAP & SPLIT (Default standard 2-column) */}
        {(variant === "split" || variant === "map") && (
          <div>
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 mb-4">
                <span className="w-8 h-[1px] bg-brand-maroon"></span>
                <span className="text-xs font-mono text-brand-maroon uppercase tracking-widest font-semibold">
                  {content.heading || "Venue"}
                </span>
              </div>
              <h2 className="text-3xl @min-[48rem]:text-5xl font-medium text-brand-dark leading-tight tracking-tight mb-4">
                {content.title || event.venue || "Event Venue"}
              </h2>
              {content.description && (
                <p className="text-lg text-brand-muted max-w-3xl whitespace-pre-line leading-relaxed">
                  {content.description}
                </p>
              )}
            </div>

            <div className="flex flex-col @min-[64rem]:flex-row @min-[64rem]:space-x-12 @min-[80rem]:space-x-16">
              <div className="w-full @min-[64rem]:w-2/3 mb-10 @min-[64rem]:mb-0">
                {showMap ? (
                  <VenueMap query={mapQuery} label={address} photo={photo} slug={eventSlug} className="w-full h-[320px] @min-[48rem]:h-[420px] rounded-xl border border-brand-border shadow-xs" />
                ) : (
                  <div className="relative aspect-video w-full overflow-hidden bg-brand-soft rounded-xl shadow-xs">
                    <img
                      src={imageUrl}
                      alt="Venue building"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border border-brand-maroon/10 mix-blend-overlay"></div>
                  </div>
                )}
              </div>

              <div className="w-full @min-[64rem]:w-1/3 flex flex-col justify-center">
                <div className="space-y-8 bg-brand-soft/50 p-6 @min-[48rem]:p-8 rounded-xl border border-brand-border">
                  <div>
                    <h3 className="text-xs font-mono text-brand-muted uppercase tracking-wider mb-1">Location</h3>
                    <p className="text-xl font-medium text-brand-dark">{event.location}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xs font-mono text-brand-muted uppercase tracking-wider mb-1">Dates</h3>
                    <p className="text-xl font-medium text-brand-dark">{event.date}</p>
                  </div>

                  {showMap && (
                    <div>
                      <Link
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-brand-maroon font-medium hover:text-brand-deep-maroon transition-colors group"
                      >
                        <span>View on Map</span>
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
