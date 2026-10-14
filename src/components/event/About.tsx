import { EventData } from "@/types/event";
import { AboutVariant } from "@/data/templates";

interface AboutProps {
  event: EventData;
  section?: any;
  variant?: AboutVariant;
}

export default function About({ event, section, variant = "split" }: AboutProps) {
  const content = section?.content || {};

  const headingText = content.heading || (
    variant === "manifesto" ? "The Manifesto" :
    variant === "briefing" ? "Executive Briefing" :
    variant === "outcomes" ? "What You'll Learn" :
    variant === "categories" ? "Course & Experience" :
    variant === "story" ? "Our Story" :
    variant === "editorial" ? "Curator's Note" :
    "About the Event"
  );

  const titleText = content.title || (
    variant === "manifesto" ? "Rethinking the boundaries of craft and code." :
    variant === "briefing" ? "Strategic context for enterprise decision-makers." :
    variant === "outcomes" ? "Practical frameworks and actionable skills you will master." :
    variant === "categories" ? "Engineered for endurance, speed, and community." :
    variant === "story" ? "A gathering built on connection, trust, and shared ambition." :
    variant === "editorial" ? "Where leaders meet ideas, people, and possibilities." :
    "Where leaders meet ideas, people, and possibilities."
  );

  const descriptionText = content.description || event.description || (
    `${event.name} brings together leaders, professionals, and innovators for focused conversations, insights, and high-impact collaboration.`
  );

  const imageUrl = content.image || "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=2070&auto=format&fit=crop";

  return (
    <section id="about" className="bg-brand-white py-20 md:py-28 border-t border-brand-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* VARIANT: MANIFESTO (Creative / Experimental Typography) */}
        {variant === "manifesto" && (
          <div className="border-4 border-brand-dark p-8 md:p-16 bg-brand-soft/40 relative">
            <span className="font-mono text-xs uppercase tracking-widest text-brand-maroon font-bold block mb-4">
              // {headingText}
            </span>
            <h2 className="text-3xl md:text-6xl font-black text-brand-dark tracking-tighter leading-none mb-8 uppercase">
              {titleText}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-8 border-t-2 border-brand-dark items-start">
              <div className="md:col-span-8 text-lg md:text-2xl font-light text-brand-dark leading-relaxed whitespace-pre-wrap">
                {descriptionText}
              </div>
              <div className="md:col-span-4 bg-brand-dark text-white p-6 font-mono text-xs uppercase tracking-wider space-y-3">
                <div className="text-brand-maroon font-bold">// PRINCIPLE</div>
                <p className="normal-case font-sans text-sm text-gray-300">
                  Real change happens when theory is tested against practice. Experience this ethos across every session at {event.name}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VARIANT: BRIEFING (Executive / Corporate Summary) */}
        {variant === "briefing" && (
          <div className="space-y-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center space-x-2 mb-4">
                <span className="w-8 h-[1px] bg-brand-maroon"></span>
                <span className="text-xs font-mono text-brand-maroon uppercase tracking-widest font-semibold">
                  {headingText}
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-brand-dark leading-tight tracking-tight mb-6">
                {titleText}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7 bg-brand-soft border border-brand-border p-8 md:p-10 rounded-xl flex flex-col justify-between">
                <div className="prose prose-lg text-brand-dark whitespace-pre-wrap leading-relaxed">
                  {descriptionText}
                </div>
                <div className="pt-8 mt-8 border-t border-brand-border/80 flex flex-wrap gap-4 text-xs font-mono uppercase tracking-wider text-brand-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-maroon"></span>
                    Verified Briefing
                  </span>
                  <span>Executive Chatham House Rule</span>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-brand-soft border border-brand-border">
                  <img src={imageUrl} alt="Event briefing" className="w-full h-full object-cover filter contrast-105" />
                </div>
                <div className="p-6 bg-brand-white border border-brand-border rounded-xl">
                  <span className="text-xs font-mono uppercase tracking-wider text-brand-maroon font-bold block mb-1">
                    Event Focus
                  </span>
                  <p className="text-sm text-brand-muted">
                    Designed for senior stakeholders to exchange practical insights and formulate high-impact strategies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VARIANT: OUTCOMES (Workshop / Hands-on Learning) */}
        {variant === "outcomes" && (
          <div className="space-y-12">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-mono text-brand-maroon uppercase tracking-widest font-bold block mb-3">
                {headingText}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-brand-dark leading-tight tracking-tight mb-4">
                {titleText}
              </h2>
              <p className="text-lg text-brand-muted max-w-2xl mx-auto">
                {descriptionText}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-6 rounded-xl border border-brand-border bg-brand-soft">
                <div className="w-10 h-10 rounded-lg bg-brand-maroon text-white flex items-center justify-center font-bold mb-4">
                  01
                </div>
                <h3 className="text-lg font-bold text-brand-dark mb-2">Core Principles &amp; Architecture</h3>
                <p className="text-sm text-brand-muted leading-relaxed">
                  Deep-dive into verified frameworks, best practices, and foundational paradigms directly with experienced practitioners.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-brand-border bg-brand-soft">
                <div className="w-10 h-10 rounded-lg bg-brand-maroon text-white flex items-center justify-center font-bold mb-4">
                  02
                </div>
                <h3 className="text-lg font-bold text-brand-dark mb-2">Hands-on Implementation</h3>
                <p className="text-sm text-brand-muted leading-relaxed">
                  Participate in live exercises, step-by-step walkthroughs, and problem-solving workshops that build tangible capability.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-brand-border bg-brand-soft">
                <div className="w-10 h-10 rounded-lg bg-brand-maroon text-white flex items-center justify-center font-bold mb-4">
                  03
                </div>
                <h3 className="text-lg font-bold text-brand-dark mb-2">Deployable Takeaways</h3>
                <p className="text-sm text-brand-muted leading-relaxed">
                  Leave with ready-to-use workflows, reference resources, and an actionable roadmap to apply immediately.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VARIANT: CATEGORIES (Sports / Course & Athletic Experience) */}
        {variant === "categories" && (
          <div className="space-y-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 mb-4">
                <span className="w-8 h-[1px] bg-brand-maroon"></span>
                <span className="text-xs font-mono text-brand-maroon uppercase tracking-widest font-bold">
                  {headingText}
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black uppercase text-brand-dark leading-none tracking-tight mb-6">
                {titleText}
              </h2>
              <p className="text-lg text-brand-muted leading-relaxed whitespace-pre-wrap">
                {descriptionText}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 aspect-[16/9] rounded-2xl overflow-hidden border-2 border-brand-dark shadow-md">
                <img src={imageUrl} alt="Event experience" className="w-full h-full object-cover" />
              </div>
              <div className="lg:col-span-5 space-y-4">
                <div className="p-6 bg-brand-soft border-2 border-brand-dark rounded-xl">
                  <span className="text-xs font-mono uppercase tracking-widest font-bold text-brand-maroon block mb-1">
                    Event Format
                  </span>
                  <div className="text-xl font-bold text-brand-dark uppercase">
                    {event.type} · {event.format}
                  </div>
                </div>
                <div className="p-6 bg-brand-soft border-2 border-brand-dark rounded-xl">
                  <span className="text-xs font-mono uppercase tracking-widest font-bold text-brand-maroon block mb-1">
                    Host Location
                  </span>
                  <div className="text-xl font-bold text-brand-dark">
                    {event.venue || event.location}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VARIANT: STORY (Community & Warm Human Narrative) */}
        {variant === "story" && (
          <div className="max-w-4xl mx-auto space-y-10 text-center">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-brand-maroon font-bold block mb-3">
                {headingText}
              </span>
              <h2 className="text-3xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight">
                {titleText}
              </h2>
            </div>
            
            <div className="aspect-[21/9] rounded-2xl overflow-hidden shadow-sm bg-brand-soft">
              <img src={imageUrl} alt="Community story" className="w-full h-full object-cover" />
            </div>

            <div className="max-w-2xl mx-auto text-lg text-brand-dark leading-relaxed whitespace-pre-wrap text-left md:text-center">
              {descriptionText}
            </div>
          </div>
        )}

        {/* VARIANT: EDITORIAL & SPLIT (Default Magazine & Clean Split) */}
        {(variant === "editorial" || variant === "split") && (
          <div className={`flex flex-col lg:items-start lg:space-x-16 xl:space-x-24 ${content.imagePosition === 'left' ? 'lg:flex-row-reverse lg:space-x-reverse' : 'lg:flex-row'}`}>
            <div className="w-full lg:w-1/2 mb-12 lg:mb-0">
              <div className="inline-flex items-center space-x-2 mb-6">
                <span className="w-8 h-[1px] bg-brand-maroon"></span>
                <span className="text-xs font-mono text-brand-maroon uppercase tracking-widest font-semibold">
                  {headingText}
                </span>
              </div>
              
              <h2 className="text-3xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight mb-8">
                {titleText}
              </h2>
              
              <div className="prose prose-lg text-brand-muted leading-relaxed whitespace-pre-wrap">
                {descriptionText}
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-brand-soft rounded-xl shadow-xs">
                <img
                  src={imageUrl}
                  alt="About the event"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border border-brand-maroon/10 mix-blend-overlay"></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
