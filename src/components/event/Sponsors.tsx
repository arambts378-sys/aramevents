import { EventData } from "@/types/event";

interface SponsorsProps {
  event: EventData;
  section?: any;
}

/** "Become a sponsor / partner" buttons, shown only for kinds the organizer has packages for. */
export function SponsorButtons({ event, centered = true }: { event: EventData & { slug?: string; id?: string }; centered?: boolean }) {
  const offers = event.sponsorOffers;
  if (!offers || (!offers.sponsor && !offers.partner)) return null;
  const base = `/events/${event.slug || event.id}/register`;
  return (
    <div className={`flex flex-col @min-[30rem]:flex-row gap-3 ${centered ? "justify-center items-stretch @min-[30rem]:items-center" : ""}`}>
      {offers.sponsor && (
        <a
          href={`${base}?as=sponsor`}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-brand-maroon text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">workspace_premium</span>
          Become a sponsor
        </a>
      )}
      {offers.partner && (
        <a
          href={`${base}?as=partner`}
          className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors ${
            offers.sponsor
              ? "border border-brand-dark/20 bg-brand-white text-brand-dark hover:border-brand-maroon hover:text-brand-maroon"
              : "bg-brand-maroon text-white shadow-sm hover:opacity-90"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">handshake</span>
          Become a partner
        </a>
      )}
    </div>
  );
}

export default function Sponsors({ event, section }: SponsorsProps) {
  const content = section?.content || {};
  const sponsorList = (event.sponsors || []).filter((s) => s.kind !== "partner");
  const partnerList = (event.sponsors || []).filter((s) => s.kind === "partner");
  const hasOffers = Boolean(event.sponsorOffers?.sponsor || event.sponsorOffers?.partner);
  return (
    <section id="sponsors" className="bg-brand-soft website-section border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 @min-[40rem]:px-6 @min-[64rem]:px-8">
        <div className="text-center mb-8 @min-[48rem]:mb-10">
          <div className="inline-flex items-center space-x-2 mb-6">
            <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
              {content.heading || "Sponsors"}
            </span>
          </div>
          <h2 className="text-3xl @min-[48rem]:text-4xl @min-[64rem]:text-5xl font-medium text-brand-dark max-w-3xl mx-auto leading-tight tracking-tight">
            {content.title || "Supported by organizations building the future."}
          </h2>
        </div>

        {event.sponsors && event.sponsors.length > 0 ? (
          <div className="space-y-10">
            {[sponsorList, partnerList].filter((group) => group.length > 0).map((group, index) => (
              <div key={index}>
                {partnerList.length > 0 && (
                  <h3 className="text-center text-sm font-mono text-brand-muted uppercase tracking-widest mb-4">
                    {group === partnerList ? "Partners" : "Sponsors"}
                  </h3>
                )}
                <div className="grid grid-cols-2 @min-[48rem]:grid-cols-3 @min-[64rem]:grid-cols-5 gap-8 items-center justify-items-center">
                  {group.map((sponsor) => {
                    const name = (
                      <span className="text-2xl @min-[48rem]:text-3xl font-bold text-brand-dark tracking-tighter text-center">
                        {sponsor.name}
                      </span>
                    );
                    return (
                      <div key={sponsor.id} className="w-full max-w-[200px] aspect-[3/2] flex flex-col items-center justify-center filter grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                        {sponsor.website_url ? (
                          <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer">{name}</a>
                        ) : name}
                        {(content.showTiers ?? true) && sponsor.tier && (
                          <span className="text-xs font-mono text-brand-muted mt-1">{sponsor.tier}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {hasOffers && (
              <div className="pt-8 border-t border-brand-border text-center space-y-4">
                <p className="text-brand-muted">Want your brand here? Support this event and reach its audience.</p>
                <SponsorButtons event={event} />
              </div>
            )}
          </div>
        ) : hasOffers ? (
          <div className="py-12 px-6 border border-brand-border rounded-xl flex flex-col items-center justify-center text-center bg-brand-white space-y-5">
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-brand-dark">Be among the first to support this event</h3>
              <p className="text-brand-muted max-w-xl">Choose a package or your own amount, pay securely online, and get an invoice straight away.</p>
            </div>
            <SponsorButtons event={event} />
          </div>
        ) : (
          <div className="py-12 border-2 border-dashed border-brand-border rounded-xl flex flex-col items-center justify-center bg-brand-white">
            <svg className="w-12 h-12 text-brand-muted/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-medium text-brand-dark mb-2">Sponsors Available Soon</h3>
            <p className="text-brand-muted font-medium">Sponsor information is currently being finalized.</p>
          </div>
        )}
      </div>
    </section>
  );
}
