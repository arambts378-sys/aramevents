import { useState, useEffect } from "react";
import { EventData } from "@/types/event";
import { speakersService } from "@/services/speakers";
import { EventPerson } from "@/types";
import { SpeakerVariant } from "@/data/templates";

interface SpeakersProps {
  event: any;
  section?: any;
  variant?: SpeakerVariant;
}

export default function Speakers({ event, section, variant = "grid" }: SpeakersProps) {
  const content = section?.content || {};
  const [speakers, setSpeakers] = useState<EventPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpeakers = async () => {
      if (!event?.id) return;
      try {
        const data = await speakersService.getEventSpeakers(event.id);
        setSpeakers(data);
      } catch (error) {
        console.error("Error fetching speakers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpeakers();
  }, [event?.id]);

  const showOrganization = content.showOrganization ?? true;
  const showRole = content.showRole ?? true;

  const headingText = content.heading || (
    variant === "lineup" ? "Lineup" :
    variant === "executive" ? "Leadership" :
    variant === "compact" ? "Instructors" :
    "Speakers"
  );

  const titleText = content.title || (
    variant === "lineup" ? "Featured artists and creators" :
    variant === "executive" ? "Executive leadership & keynotes" :
    variant === "spotlight" ? "Thought leaders shaping the future" :
    variant === "circular" ? "Mindful guides & practitioners" :
    variant === "compact" ? "Learn directly from practitioners" :
    "Voices shaping what comes next."
  );

  // Empty state renderer
  const renderEmptyState = () => (
    <div className="py-16 border-2 border-dashed border-brand-border rounded-xl flex flex-col items-center justify-center bg-brand-soft/50 text-center px-4">
      <span className="material-symbols-outlined text-4xl text-brand-muted/60 mb-3">group</span>
      <h3 className="text-lg font-medium text-brand-dark mb-1">Speaker lineup to be announced</h3>
      <p className="text-sm text-brand-muted max-w-sm">
        Speakers and guest luminaries will appear here once confirmed.
      </p>
    </div>
  );

  return (
    <section id="speakers" className="bg-brand-soft py-20 md:py-28 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`mb-14 md:mb-20 ${variant === "circular" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}`}>
          <div className={`inline-flex items-center space-x-2 mb-4 ${variant === "circular" ? "justify-center" : ""}`}>
            <span className="w-8 h-[1px] bg-brand-maroon"></span>
            <span className="text-xs font-mono text-brand-maroon uppercase tracking-widest font-semibold">
              {headingText}
            </span>
            {variant === "circular" && <span className="w-8 h-[1px] bg-brand-maroon"></span>}
          </div>
          <h2 className="text-3xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight">
            {titleText}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-maroon"></div>
          </div>
        ) : speakers.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {/* VARIANT: SPOTLIGHT (Editorial / Featured Large Portrait + Side Grid) */}
            {variant === "spotlight" && (
              <div className="space-y-12">
                {speakers[0] && (
                  <div className="bg-brand-white border border-brand-border p-6 md:p-10 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-sm">
                    <div className="lg:col-span-5 aspect-[4/5] rounded-xl overflow-hidden bg-brand-border/40 relative">
                      {speakers[0].person?.avatar_url ? (
                        <img
                          src={speakers[0].person.avatar_url}
                          alt={`${speakers[0].person.first_name} ${speakers[0].person.last_name || ""}`}
                          className="w-full h-full object-cover filter grayscale contrast-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-muted">
                          Featured Speaker
                        </div>
                      )}
                      <div className="absolute top-4 left-4 bg-brand-maroon text-white font-mono text-xs px-2.5 py-1 uppercase tracking-wider rounded-sm">
                        Keynote Spotlight
                      </div>
                    </div>
                    <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
                      <div className="space-y-1">
                        <span className="text-xs font-mono text-brand-muted uppercase tracking-widest">
                          01 / Featured Speaker
                        </span>
                        <h3 className="text-3xl md:text-4xl font-semibold text-brand-dark">
                          {speakers[0].person?.first_name} {speakers[0].person?.last_name}
                        </h3>
                        {showRole && speakers[0].person?.job_title && (
                          <p className="text-lg text-brand-maroon font-medium">
                            {speakers[0].person.job_title}
                          </p>
                        )}
                        {showOrganization && speakers[0].person?.organization && (
                          <p className="text-sm font-mono text-brand-muted uppercase tracking-wider">
                            {speakers[0].person.organization}
                          </p>
                        )}
                      </div>
                      {speakers[0].speaker_profile?.bio && (
                        <p className="text-brand-muted leading-relaxed text-sm md:text-base border-t border-brand-border/60 pt-4">
                          {speakers[0].speaker_profile.bio}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {speakers.length > 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                    {speakers.slice(1).map((speaker, idx) => (
                      <div
                        key={speaker.id}
                        className="bg-brand-white border border-brand-border p-5 rounded-xl flex items-center gap-4 hover:border-brand-maroon transition-colors"
                      >
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-border/40 shrink-0">
                          {speaker.person?.avatar_url ? (
                            <img
                              src={speaker.person.avatar_url}
                              alt={speaker.person.first_name}
                              className="w-full h-full object-cover grayscale"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-brand-muted">
                              No Pic
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono text-brand-muted">
                            0{idx + 2}
                          </span>
                          <h4 className="text-base font-semibold text-brand-dark truncate">
                            {speaker.person?.first_name} {speaker.person?.last_name}
                          </h4>
                          {showRole && speaker.person?.job_title && (
                            <p className="text-xs text-brand-maroon truncate">
                              {speaker.person.job_title}
                            </p>
                          )}
                          {showOrganization && speaker.person?.organization && (
                            <p className="text-[11px] text-brand-muted font-mono uppercase truncate">
                              {speaker.person.organization}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VARIANT: EXECUTIVE (Leadership cards with corporate title / org prominence) */}
            {variant === "executive" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {speakers.map((speaker) => (
                  <div
                    key={speaker.id}
                    className="bg-brand-white border border-brand-border p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-brand-border/30 shrink-0">
                        {speaker.person?.avatar_url ? (
                          <img
                            src={speaker.person.avatar_url}
                            alt={speaker.person.first_name}
                            className="w-full h-full object-cover filter contrast-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-brand-muted">
                            Executive
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-brand-dark leading-snug">
                          {speaker.person?.first_name} {speaker.person?.last_name}
                        </h3>
                        {showRole && speaker.person?.job_title && (
                          <p className="text-xs font-semibold text-brand-maroon mt-1">
                            {speaker.person.job_title}
                          </p>
                        )}
                        {showOrganization && speaker.person?.organization && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand-soft border border-brand-border text-[10px] font-mono uppercase font-bold text-brand-dark tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-maroon"></span>
                            <span>{speaker.person.organization}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {speaker.speaker_profile?.bio && (
                      <p className="text-xs text-brand-muted leading-relaxed line-clamp-3 pt-3 border-t border-brand-border/60">
                        {speaker.speaker_profile.bio}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* VARIANT: LINEUP (Poster-style high-impact festival presentation) */}
            {variant === "lineup" && (
              <div className="bg-brand-white/80 border-2 border-brand-dark p-8 md:p-14 rounded-2xl shadow-sm">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 text-center divide-brand-maroon">
                  {speakers.map((speaker, idx) => {
                    const isHeadliner = idx < 2;
                    return (
                      <div key={speaker.id} className="inline-flex items-center gap-3 group">
                        <div className="relative">
                          {speaker.person?.avatar_url && (
                            <img
                              src={speaker.person.avatar_url}
                              alt={speaker.person.first_name}
                              className={`rounded-full object-cover border-2 border-brand-dark grayscale group-hover:grayscale-0 transition-all ${
                                isHeadliner ? "w-14 h-14" : "w-10 h-10"
                              }`}
                            />
                          )}
                        </div>
                        <div className="text-left">
                          <span
                            className={`font-black uppercase tracking-tight block group-hover:text-brand-maroon transition-colors ${
                              isHeadliner
                                ? "text-2xl md:text-4xl text-brand-dark"
                                : "text-lg md:text-xl text-brand-dark/90"
                            }`}
                          >
                            {speaker.person?.first_name} {speaker.person?.last_name}
                          </span>
                          {(showRole || showOrganization) && (
                            <span className="text-[11px] font-mono uppercase text-brand-muted tracking-widest block">
                              {[
                                showRole ? speaker.person?.job_title : null,
                                showOrganization ? speaker.person?.organization : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </div>
                        {idx < speakers.length - 1 && (
                          <span className="text-brand-maroon font-black mx-2 text-xl select-none">
                            /
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VARIANT: CIRCULAR (Wellness / Serene retreat avatars) */}
            {variant === "circular" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 md:gap-14 text-center">
                {speakers.map((speaker) => (
                  <div key={speaker.id} className="flex flex-col items-center group">
                    <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden mb-5 border-4 border-brand-white shadow-md bg-brand-border/40 group-hover:border-brand-maroon transition-all duration-500">
                      {speaker.person?.avatar_url ? (
                        <img
                          src={speaker.person.avatar_url}
                          alt={speaker.person.first_name}
                          className="w-full h-full object-cover filter contrast-105 group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-brand-muted">
                          Guide
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-medium text-brand-dark">
                      {speaker.person?.first_name} {speaker.person?.last_name}
                    </h3>
                    {showRole && speaker.person?.job_title && (
                      <p className="text-sm text-brand-maroon mt-1 font-medium">
                        {speaker.person.job_title}
                      </p>
                    )}
                    {showOrganization && speaker.person?.organization && (
                      <p className="text-xs font-mono text-brand-muted uppercase tracking-wider mt-1">
                        {speaker.person.organization}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* VARIANT: COMPACT (Workshop / Instructor row cards) */}
            {variant === "compact" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {speakers.map((speaker) => (
                  <div
                    key={speaker.id}
                    className="p-5 bg-brand-white border border-brand-border rounded-xl flex items-center gap-5 hover:border-brand-maroon transition-colors"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-border/40 shrink-0">
                      {speaker.person?.avatar_url ? (
                        <img
                          src={speaker.person.avatar_url}
                          alt={speaker.person.first_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-brand-muted">
                          Instructor
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-maroon bg-brand-soft px-2 py-0.5 rounded mb-1">
                        Instructor
                      </div>
                      <h3 className="text-lg font-semibold text-brand-dark truncate">
                        {speaker.person?.first_name} {speaker.person?.last_name}
                      </h3>
                      {showRole && speaker.person?.job_title && (
                        <p className="text-xs text-brand-muted truncate">
                          {speaker.person.job_title}
                        </p>
                      )}
                      {showOrganization && speaker.person?.organization && (
                        <p className="text-[11px] font-mono text-brand-muted uppercase truncate">
                          {speaker.person.organization}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VARIANT: ASYMMETRIC (Creative / Experimental masonry vibe) */}
            {variant === "asymmetric" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {speakers.map((speaker, index) => {
                  const isTall = index % 3 === 0;
                  return (
                    <div
                      key={speaker.id}
                      className={`group border-b-2 border-brand-dark pb-6 ${
                        isTall ? "lg:translate-y-4" : ""
                      }`}
                    >
                      <div
                        className={`overflow-hidden bg-brand-border/40 mb-4 border border-brand-dark relative ${
                          isTall ? "aspect-[3/4]" : "aspect-[4/3]"
                        }`}
                      >
                        {speaker.person?.avatar_url ? (
                          <img
                            src={speaker.person.avatar_url}
                            alt={speaker.person.first_name}
                            className="w-full h-full object-cover filter grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-brand-muted">
                            Artist / Speaker
                          </div>
                        )}
                        <span className="absolute bottom-2 left-2 text-[10px] font-mono uppercase bg-brand-dark text-white px-2 py-0.5">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-brand-dark tracking-tight">
                        {speaker.person?.first_name} {speaker.person?.last_name}
                      </h3>
                      {showRole && speaker.person?.job_title && (
                        <p className="text-sm font-mono text-brand-maroon uppercase mt-1">
                          {speaker.person.job_title}
                        </p>
                      )}
                      {showOrganization && speaker.person?.organization && (
                        <p className="text-xs text-brand-muted uppercase mt-0.5">
                          {speaker.person.organization}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* VARIANT: GRID (Balanced classic conference grid) */}
            {variant === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
                {speakers.map((speaker) => (
                  <div key={speaker.id} className="group cursor-default">
                    <div className="relative aspect-[3/4] mb-5 overflow-hidden bg-brand-border rounded-xl">
                      {speaker.person?.avatar_url ? (
                        <img
                          src={speaker.person.avatar_url}
                          alt={`${speaker.person.first_name} ${speaker.person.last_name || ""}`}
                          className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700 ease-out scale-100 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-muted bg-brand-border/50">
                          No Image
                        </div>
                      )}
                      <div className="absolute inset-0 bg-brand-maroon/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 mix-blend-multiply"></div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-brand-dark mb-1">
                        {speaker.person?.first_name} {speaker.person?.last_name}
                      </h3>
                      {showRole && speaker.person?.job_title && (
                        <p className="text-brand-maroon font-medium text-sm mb-1">
                          {speaker.person.job_title}
                        </p>
                      )}
                      {showOrganization && speaker.person?.organization && (
                        <p className="text-brand-muted text-xs uppercase tracking-wide font-mono">
                          {speaker.person.organization}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
