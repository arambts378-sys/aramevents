import { EventData } from "@/types/event";
import { AgendaVariant } from "@/data/templates";

interface AgendaProps {
  event: EventData;
  section?: any;
  variant?: AgendaVariant;
}

export default function Agenda({ event, section, variant = "timeline" }: AgendaProps) {
  const content = section?.content || {};

  const headingText = content.heading || (
    variant === "race-day" ? "Race Timeline" :
    variant === "modules" ? "Curriculum" :
    variant === "daily-rhythm" ? "Daily Rhythm" :
    variant === "cards" ? "Briefing Schedule" :
    variant === "table" ? "Festival Lineup & Stages" :
    "Agenda"
  );

  const titleText = content.title || (
    variant === "race-day" ? "Official Race Day Timetable" :
    variant === "modules" ? "Hands-on Modules & Learning Flow" :
    variant === "daily-rhythm" ? "Restorative Schedule & Sessions" :
    variant === "cards" ? "Executive Summit Briefings & Keynotes" :
    variant === "table" ? "Stages, Sessions & Performances" :
    "Two days of ideas, conversations, and action."
  );

  const hasAgenda = event.agenda && event.agenda.length > 0;

  const renderEmptyState = () => (
    <div className="py-16 border-2 border-dashed border-brand-border rounded-xl flex flex-col items-center justify-center bg-brand-soft/50 text-center px-4">
      <span className="material-symbols-outlined text-4xl text-brand-muted/60 mb-3">calendar_today</span>
      <h3 className="text-xl font-medium text-brand-dark mb-1">
        {variant === "race-day" ? "Race Schedule Coming Soon" :
         variant === "modules" ? "Curriculum Being Finalized" :
         variant === "daily-rhythm" ? "Session Schedule Coming Soon" :
         "Agenda Available Soon"}
      </h3>
      <p className="text-sm text-brand-muted max-w-sm">
        The detailed schedule and session timeline are currently being finalized.
      </p>
    </div>
  );

  return (
    <section id="agenda" className="bg-brand-white py-20 md:py-28 border-t border-brand-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`mb-14 md:mb-20 ${variant === "daily-rhythm" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}`}>
          <div className={`inline-flex items-center space-x-2 mb-4 ${variant === "daily-rhythm" ? "justify-center" : ""}`}>
            <span className="w-8 h-[1px] bg-brand-maroon"></span>
            <span className="text-xs font-mono text-brand-maroon uppercase tracking-widest font-semibold">
              {headingText}
            </span>
            {variant === "daily-rhythm" && <span className="w-8 h-[1px] bg-brand-maroon"></span>}
          </div>
          <h2 className="text-3xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight">
            {titleText}
          </h2>
        </div>

        {!hasAgenda ? (
          renderEmptyState()
        ) : (
          <>
            {/* VARIANT: MODULES (Workshop / Syllabus style) */}
            {variant === "modules" && (
              <div className="space-y-12">
                {event.agenda!.map((day) => (
                  <div key={day.id} className="space-y-6">
                    <div className="flex items-center gap-4 pb-4 border-b border-brand-border">
                      <span className="text-sm font-mono font-bold text-white bg-brand-dark px-3 py-1 rounded">
                        DAY {day.dayNumber}
                      </span>
                      <span className="text-sm font-mono uppercase text-brand-muted">
                        {day.date}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {day.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="bg-brand-soft border border-brand-border rounded-xl p-6 hover:border-brand-maroon transition-all shadow-xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-mono font-bold text-brand-maroon bg-brand-white px-2.5 py-1 rounded border border-brand-border">
                                MODULE {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="text-xs font-mono font-semibold text-brand-muted">
                                {item.time}
                              </span>
                            </div>
                            <h4 className="text-xl font-bold text-brand-dark mb-2">
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className="text-sm text-brand-muted leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between text-xs font-mono text-brand-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Interactive Session
                            </span>
                            <span>Hands-on Lab</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VARIANT: RACE-DAY (Sports race-day timeline with checkpoints) */}
            {variant === "race-day" && (
              <div className="space-y-10">
                {event.agenda!.map((day) => (
                  <div key={day.id} className="bg-brand-soft border-2 border-brand-dark rounded-2xl p-6 md:p-10 shadow-sm">
                    <div className="flex items-center justify-between pb-6 mb-8 border-b-2 border-brand-dark">
                      <div>
                        <span className="text-xs font-mono uppercase tracking-widest text-brand-maroon font-bold block mb-1">
                          OFFICIAL TIMETABLE
                        </span>
                        <h3 className="text-2xl md:text-3xl font-black uppercase text-brand-dark">
                          Race Day {day.dayNumber}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold bg-brand-dark text-white px-3 py-1.5 rounded uppercase">
                          {day.date}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-brand-border">
                      {day.items.map((item, idx) => (
                        <div key={item.id} className="py-4 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-dark text-white font-mono font-bold flex items-center justify-center shrink-0 group-hover:bg-brand-maroon transition-colors text-sm">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="text-lg md:text-xl font-bold uppercase text-brand-dark group-hover:text-brand-maroon transition-colors">
                                {item.title}
                              </h4>
                              {item.description && (
                                <p className="text-sm text-brand-muted mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="pl-14 md:pl-0 flex items-center gap-3">
                            <span className="px-3 py-1 bg-brand-white border border-brand-border rounded font-mono text-base font-bold text-brand-dark tracking-wide">
                              {item.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VARIANT: DAILY-RHYTHM (Wellness mindful session blocks) */}
            {variant === "daily-rhythm" && (
              <div className="max-w-4xl mx-auto space-y-12">
                {event.agenda!.map((day) => (
                  <div key={day.id} className="space-y-6">
                    <div className="text-center pb-4 border-b border-brand-border">
                      <h3 className="text-2xl font-serif text-brand-dark mb-1">
                        Day {day.dayNumber} Flow
                      </h3>
                      <p className="text-xs font-mono uppercase tracking-widest text-brand-muted">
                        {day.date}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {day.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-brand-soft/60 border border-brand-border/60 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-brand-soft transition-colors"
                        >
                          <div className="md:w-32 shrink-0">
                            <span className="text-xs font-mono text-brand-maroon font-bold tracking-widest uppercase block mb-1">
                              Session
                            </span>
                            <span className="text-xl font-light text-brand-dark font-mono">
                              {item.time}
                            </span>
                          </div>
                          <div className="flex-1 md:border-l md:border-brand-border/60 md:pl-8">
                            <h4 className="text-xl font-medium text-brand-dark mb-2">
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className="text-sm text-brand-muted leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VARIANT: CARDS (Executive Briefing schedule cards) */}
            {variant === "cards" && (
              <div className="space-y-10">
                {event.agenda!.map((day) => (
                  <div key={day.id} className="space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b-2 border-brand-dark">
                      <h3 className="text-2xl font-bold text-brand-dark">
                        Day {day.dayNumber} · Executive Schedule
                      </h3>
                      <span className="text-xs font-mono uppercase tracking-widest text-brand-muted">
                        {day.date}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {day.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-brand-white border border-brand-border p-6 rounded-lg shadow-sm hover:border-brand-maroon transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs font-mono text-brand-muted mb-4 pb-2 border-b border-brand-border/40">
                              <span className="text-brand-maroon font-bold">EXECUTIVE SESSION</span>
                              <span>{item.time}</span>
                            </div>
                            <h4 className="text-lg font-bold text-brand-dark leading-snug mb-2">
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className="text-xs text-brand-muted leading-relaxed line-clamp-3">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-brand-border/40 flex items-center justify-between text-[11px] font-mono text-brand-dark">
                            <span className="font-semibold uppercase tracking-wider">Boardroom / Main</span>
                            <span className="text-brand-maroon font-bold">Priority Access</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VARIANT: TABLE (Festival stages & sets timetable) */}
            {variant === "table" && (
              <div className="space-y-8">
                {event.agenda!.map((day) => (
                  <div key={day.id} className="border-2 border-brand-dark rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-brand-dark text-white p-4 md:px-6 flex items-center justify-between">
                      <h3 className="font-black uppercase tracking-wider text-lg">
                        Day {day.dayNumber} · Festival Stages
                      </h3>
                      <span className="font-mono text-xs text-brand-muted uppercase">
                        {day.date}
                      </span>
                    </div>
                    <div className="divide-y divide-brand-border bg-brand-white">
                      {day.items.map((item, idx) => (
                        <div key={item.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-brand-soft/40 transition-colors">
                          <div className="flex items-start md:items-center gap-4">
                            <span className="text-xs font-mono font-bold bg-brand-maroon text-white px-2.5 py-1 rounded">
                              SET {idx + 1}
                            </span>
                            <div>
                              <h4 className="text-lg font-bold text-brand-dark">
                                {item.title}
                              </h4>
                              {item.description && (
                                <p className="text-xs text-brand-muted mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-base font-black font-mono text-brand-dark">
                              {item.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VARIANT: MULTI-TRACK (Conference columnar layout) */}
            {variant === "multi-track" && (
              <div className="space-y-12">
                {event.agenda!.map((day) => (
                  <div key={day.id} className="space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-brand-maroon"></span>
                        <h3 className="text-2xl font-bold text-brand-dark">
                          Day {day.dayNumber}
                        </h3>
                      </div>
                      <span className="text-xs font-mono uppercase text-brand-muted">
                        {day.date}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {day.items.map((item, idx) => {
                        const trackName = idx % 2 === 0 ? "Track A: Keynote & Strategy" : "Track B: Tech & Practice";
                        return (
                          <div
                            key={item.id}
                            className="bg-brand-soft border border-brand-border rounded-xl p-6 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-maroon bg-brand-white border border-brand-border px-2 py-0.5 rounded">
                                {trackName}
                              </span>
                              <span className="text-xs font-mono font-bold text-brand-dark">
                                {item.time}
                              </span>
                            </div>
                            <h4 className="text-xl font-bold text-brand-dark mb-2">
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className="text-sm text-brand-muted leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VARIANT: TIMELINE / CHRONOLOGICAL (Editorial long-form vertical timeline) */}
            {(variant === "timeline" || variant === "chronological") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
                {event.agenda!.map((day) => (
                  <div key={day.id}>
                    <div className="mb-10 pb-6 border-b-2 border-brand-dark">
                      <h3 className="text-3xl font-medium text-brand-dark mb-2">
                        Day {day.dayNumber}
                      </h3>
                      <p className="text-brand-muted text-lg font-mono uppercase tracking-wider">
                        {day.date}
                      </p>
                    </div>

                    <div className="space-y-8">
                      {day.items.map((item) => (
                        <div key={item.id} className="relative pl-8 md:pl-0">
                          <div className="absolute left-[7px] top-2 bottom-[-24px] w-[1px] bg-brand-border md:hidden last:hidden"></div>
                          <div className="absolute left-1 top-2 w-3 h-3 rounded-full bg-brand-maroon md:hidden"></div>

                          <div className="flex flex-col md:flex-row md:items-baseline group">
                            <div className="md:w-32 flex-shrink-0 mb-2 md:mb-0">
                              <span className="text-lg font-mono text-brand-maroon font-semibold md:group-hover:text-brand-deep-maroon transition-colors">
                                {item.time}
                              </span>
                            </div>
                            <div className="md:flex-grow md:pl-8 md:border-l border-brand-border md:group-hover:border-brand-maroon transition-colors">
                              <h4 className="text-xl md:text-2xl font-medium text-brand-dark leading-tight">
                                {item.title}
                              </h4>
                              {item.description && (
                                <p className="mt-2 text-brand-muted">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
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
