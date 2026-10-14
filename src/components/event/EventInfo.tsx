import { EventData } from "@/types/event";
import { EventInfoVariant } from "@/data/templates";

interface EventInfoProps {
  event: EventData;
  section?: any;
  variant?: EventInfoVariant;
}

export default function EventInfo({ event, section, variant = "stats-strip" }: EventInfoProps) {
  const content = section?.content || {};
  const showDate = content.showDate ?? true;
  const showTime = content.showTime ?? true;
  const showLocation = content.showLocation ?? true;
  const showFormat = content.showFormat ?? true;
  const alignment = content.alignment || 'left';
  
  // Split date to get the month/year part visually separated if needed
  const dateParts = event.date ? event.date.split(" ") : ["TBD"];
  const dateRange = dateParts[0]; // e.g., "12–13"
  const monthYear = dateParts.length > 1 ? dateParts.slice(1).join(" ") : ""; // e.g., "March 2027"

  // Split time
  const timeParts = event.time ? event.time.split(" – ") : ["TBD"];
  const startTime = timeParts[0];
  const endTime = timeParts.length > 1 ? timeParts[1] : "";

  return (
    <section className="bg-brand-soft py-14 md:py-20 border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* VARIANT: EDITORIAL-META (Publication metadata columns) */}
        {variant === "editorial-meta" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-brand-border/60">
            {showDate && (
              <div className="pt-4 md:pt-0 md:px-6">
                <span className="text-[11px] font-mono text-brand-maroon uppercase tracking-widest font-semibold block mb-2">
                  // Date &amp; Season
                </span>
                <div className="text-3xl font-serif text-brand-dark">
                  {dateRange} {monthYear}
                </div>
              </div>
            )}
            {showTime && (
              <div className="pt-4 md:pt-0 md:px-6">
                <span className="text-[11px] font-mono text-brand-maroon uppercase tracking-widest font-semibold block mb-2">
                  // Schedule Hours
                </span>
                <div className="text-2xl font-mono text-brand-dark font-light">
                  {startTime} {endTime ? `– ${endTime}` : ''}
                </div>
              </div>
            )}
            {showLocation && (
              <div className="pt-4 md:pt-0 md:px-6">
                <span className="text-[11px] font-mono text-brand-maroon uppercase tracking-widest font-semibold block mb-2">
                  // Host City &amp; Venue
                </span>
                <div className="text-xl font-medium text-brand-dark">
                  {event.venue || event.location}
                </div>
              </div>
            )}
            {showFormat && (
              <div className="pt-4 md:pt-0 md:px-6">
                <span className="text-[11px] font-mono text-brand-maroon uppercase tracking-widest font-semibold block mb-2">
                  // Assembly Format
                </span>
                <div className="text-lg font-mono uppercase text-brand-dark">
                  {event.type} · {event.format}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VARIANT: METRIC-CARDS (Executive / Summit cards) */}
        {variant === "metric-cards" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {showDate && (
              <div className="bg-brand-white p-6 rounded-xl border border-brand-border shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-brand-muted block mb-2">
                  Event Dates
                </span>
                <div className="text-2xl font-bold text-brand-dark mb-1">
                  {event.date}
                </div>
                <span className="text-xs font-mono text-brand-maroon font-semibold">Calendar Sync</span>
              </div>
            )}
            {showTime && (
              <div className="bg-brand-white p-6 rounded-xl border border-brand-border shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-brand-muted block mb-2">
                  Timing
                </span>
                <div className="text-2xl font-bold text-brand-dark mb-1">
                  {startTime}
                </div>
                <span className="text-xs font-mono text-brand-muted">{endTime ? `Ends at ${endTime}` : 'All-day'}</span>
              </div>
            )}
            {showLocation && (
              <div className="bg-brand-white p-6 rounded-xl border border-brand-border shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-brand-muted block mb-2">
                  Venue Location
                </span>
                <div className="text-xl font-bold text-brand-dark truncate mb-1">
                  {event.venue || event.location}
                </div>
                <span className="text-xs text-brand-muted truncate block">{event.location}</span>
              </div>
            )}
            {showFormat && (
              <div className="bg-brand-white p-6 rounded-xl border border-brand-border shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider text-brand-muted block mb-2">
                  Access Model
                </span>
                <div className="text-xl font-bold text-brand-dark uppercase mb-1">
                  {event.format}
                </div>
                <span className="text-xs font-mono text-brand-maroon font-semibold">{event.type}</span>
              </div>
            )}
          </div>
        )}

        {/* VARIANT: MINIMAL-PILLS (Wellness / Workshop gentle pills) */}
        {variant === "minimal-pills" && (
          <div className="flex flex-wrap items-center justify-center gap-4 text-center">
            {showDate && (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-brand-white border border-brand-border shadow-2xs">
                <span className="material-symbols-outlined text-base text-brand-maroon">calendar_month</span>
                <span className="text-sm font-medium text-brand-dark">{event.date}</span>
              </div>
            )}
            {showTime && (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-brand-white border border-brand-border shadow-2xs">
                <span className="material-symbols-outlined text-base text-brand-maroon">schedule</span>
                <span className="text-sm font-medium text-brand-dark">{event.time}</span>
              </div>
            )}
            {showLocation && (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-brand-white border border-brand-border shadow-2xs">
                <span className="material-symbols-outlined text-base text-brand-maroon">location_on</span>
                <span className="text-sm font-medium text-brand-dark">{event.venue || event.location}</span>
              </div>
            )}
            {showFormat && (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-brand-white border border-brand-border shadow-2xs">
                <span className="material-symbols-outlined text-base text-brand-maroon">tune</span>
                <span className="text-sm font-mono uppercase text-brand-dark">{event.format} · {event.type}</span>
              </div>
            )}
          </div>
        )}

        {/* VARIANT: HIGHLIGHTS-GRID (Creative / Staggered blocks) */}
        {variant === "highlights-grid" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
            {showDate && (
              <div className="border-t-2 border-brand-dark pt-4">
                <span className="text-xs font-mono uppercase text-brand-muted block mb-1">DATE</span>
                <span className="text-2xl md:text-3xl font-black text-brand-dark block">{dateRange}</span>
                <span className="text-sm font-mono text-brand-maroon uppercase">{monthYear}</span>
              </div>
            )}
            {showTime && (
              <div className="border-t-2 border-brand-dark pt-4">
                <span className="text-xs font-mono uppercase text-brand-muted block mb-1">HOURS</span>
                <span className="text-xl md:text-2xl font-black text-brand-dark block">{startTime}</span>
                <span className="text-sm font-mono text-brand-muted">{endTime}</span>
              </div>
            )}
            {showLocation && (
              <div className="border-t-2 border-brand-dark pt-4">
                <span className="text-xs font-mono uppercase text-brand-muted block mb-1">VENUE</span>
                <span className="text-lg md:text-xl font-bold text-brand-dark block truncate">{event.venue || event.location}</span>
                <span className="text-xs text-brand-muted block truncate">{event.location}</span>
              </div>
            )}
            {showFormat && (
              <div className="border-t-2 border-brand-dark pt-4">
                <span className="text-xs font-mono uppercase text-brand-muted block mb-1">TYPE</span>
                <span className="text-lg md:text-xl font-bold uppercase text-brand-dark block">{event.type}</span>
                <span className="text-xs font-mono uppercase text-brand-maroon font-bold">{event.format}</span>
              </div>
            )}
          </div>
        )}

        {/* VARIANT: STATS-STRIP (Classic default strip) */}
        {variant === "stats-strip" && (
          <div className="flex flex-col md:flex-row md:flex-wrap justify-around gap-12 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-brand-border/60">
            {showDate && (
              <div className="flex flex-col flex-1 pt-8 md:pt-0 md:px-8 text-left items-start">
                <span className="text-sm font-mono text-brand-muted uppercase tracking-wider mb-4">Date</span>
                <div className="text-4xl md:text-5xl font-light text-brand-dark mb-2">
                  {dateRange}
                </div>
                <div className="text-xl text-brand-maroon font-medium">
                  {monthYear}
                </div>
              </div>
            )}

            {(showTime || showFormat) && (
              <div className="flex flex-col flex-1 pt-8 md:pt-0 md:px-8 text-left items-start">
                {showTime && (
                  <>
                    <span className="text-sm font-mono text-brand-muted uppercase tracking-wider mb-4">Time</span>
                    <div className="text-2xl font-light text-brand-dark mb-2">
                      {startTime}
                    </div>
                    {endTime && (
                      <div className="text-lg text-brand-muted mb-4">
                        to {endTime}
                      </div>
                    )}
                  </>
                )}
                {showFormat && (
                  <div className={`inline-flex items-center space-x-2 text-sm font-medium text-brand-dark bg-brand-border/30 px-3 py-1 rounded-sm w-fit ${!showTime ? 'mt-8' : ''}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-maroon"></span>
                    <span>{event.type} • {event.format}</span>
                  </div>
                )}
              </div>
            )}

            {showLocation && (
              <div className="flex flex-col flex-1 pt-8 md:pt-0 md:px-8 text-left items-start">
                <span className="text-sm font-mono text-brand-muted uppercase tracking-wider mb-4">Location</span>
                <div className="text-2xl font-light text-brand-dark mb-2">
                  {event.venue || event.location}
                </div>
                {event.venue && event.location && event.venue !== event.location && (
                  <div className="text-lg text-brand-muted">
                    {event.location}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
