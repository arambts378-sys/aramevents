import Link from "next/link";
import { FooterVariant } from "@/data/templates";

interface FooterProps {
  event?: any;
  section?: any;
  variant?: FooterVariant;
}

export default function Footer({ event, section, variant = "split" }: FooterProps) {
  const content = section?.content || {};

  const footerLinks = [
    { label: "About", href: "#about" },
    { label: "Speakers", href: "#speakers" },
    { label: "Agenda", href: "#agenda" },
    { label: "Venue", href: "#venue" },
    { label: "Sponsors", href: "#sponsors" },
    { label: "Contact", href: "#contact" },
  ];

  const logoText = content.logoText || event?.name || "Aram Events";
  const copyrightText = content.copyrightText || `${logoText}. All rights reserved.`;

  return (
    <footer className="bg-brand-dark py-14 md:py-20 text-brand-white border-t border-brand-white/10 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* VARIANT: MINIMAL (Editorial / Single clean publication bar) */}
        {variant === "minimal" && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-serif font-bold text-white tracking-tight">{logoText}</span>
              <span className="text-xs font-mono text-brand-cream/40">/ {new Date().getFullYear()}</span>
            </div>
            <nav className="flex flex-wrap items-center gap-6 text-xs font-mono uppercase tracking-wider text-brand-cream/60">
              {footerLinks.map((link) => (
                <Link key={link.label} href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
            <p className="text-xs text-brand-cream/40 font-mono">
              &copy; {new Date().getFullYear()} {copyrightText}
            </p>
          </div>
        )}

        {/* VARIANT: ARTISTIC (Creative / Experimental huge brand watermark) */}
        {variant === "artistic" && (
          <div className="space-y-12">
            <div className="border-b-2 border-brand-white/20 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-brand-maroon font-bold block mb-2">
                  // OFFICIAL GATHERING
                </span>
                <h3 className="text-4xl md:text-7xl font-black uppercase text-white tracking-tighter">
                  {logoText}
                </h3>
              </div>
              <nav className="flex flex-wrap gap-4 text-xs font-mono uppercase">
                {footerLinks.map((link) => (
                  <Link key={link.label} href={link.href} className="px-3 py-1.5 border border-brand-white/20 hover:border-brand-maroon hover:text-brand-maroon transition-colors">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-brand-cream/40 gap-4">
              <span>DESIGNED FOR HIGH-IMPACT EXPERIENCES</span>
              <span>&copy; {new Date().getFullYear()} {copyrightText}</span>
            </div>
          </div>
        )}

        {/* VARIANT: CORPORATE / MULTI-COLUMN (Executive & Enterprise) */}
        {(variant === "corporate" || variant === "multi-column") && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-brand-white/10">
              <div className="md:col-span-2 space-y-3">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {logoText}
                </h3>
                <p className="text-sm text-brand-cream/60 max-w-sm leading-relaxed">
                  {content.description || "Building the future of business and technology through meaningful connections and verified leadership dialogues."}
                </p>
                <div className="pt-2 text-xs font-mono text-brand-maroon uppercase">
                  Enterprise Leadership Edition
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-brand-cream/40 mb-4">
                  Navigation
                </h4>
                <ul className="space-y-2 text-sm text-brand-cream/80">
                  {footerLinks.slice(0, 4).map(link => (
                    <li key={link.label}>
                      <Link href={link.href} className="hover:text-white transition-colors">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-brand-cream/40 mb-4">
                  Governance
                </h4>
                <ul className="space-y-2 text-sm text-brand-cream/80">
                  <li><Link href="#" className="hover:text-white transition-colors">Code of Conduct</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">Terms of Registration</Link></li>
                  <li><Link href="#" className="hover:text-white transition-colors">Security Overview</Link></li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-brand-cream/40 gap-4">
              <p>&copy; {new Date().getFullYear()} {copyrightText}</p>
              <div className="flex gap-4">
                <span>Chatham House Rule</span>
                <span>·</span>
                <span>Executive Series</span>
              </div>
            </div>
          </div>
        )}

        {/* VARIANT: COMMUNITY (Warm story-driven footer) */}
        {variant === "community" && (
          <div className="text-center space-y-8 max-w-2xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">{logoText}</h3>
              <p className="text-sm text-brand-cream/70 leading-relaxed">
                {content.description || "A gathering centered around humans, shared knowledge, and welcoming community spaces."}
              </p>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-brand-cream/80">
              {footerLinks.map((link) => (
                <Link key={link.label} href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
            <p className="text-xs text-brand-cream/40 pt-6 border-t border-brand-white/10">
              &copy; {new Date().getFullYear()} {copyrightText}
            </p>
          </div>
        )}

        {/* VARIANT: SPLIT (Default 2-column) */}
        {variant === "split" && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16">
              <div className="mb-8 md:mb-0 max-w-sm">
                <h3 className="text-2xl font-bold text-brand-maroon tracking-tight mb-2">
                  {logoText}
                </h3>
                <p className="text-brand-cream/60 font-medium">
                  {content.description || "Building the future of business and technology through meaningful connections."}
                </p>
              </div>

              <nav className="flex flex-wrap gap-x-8 gap-y-4">
                {footerLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-brand-cream/80 hover:text-brand-white transition-colors font-medium text-sm"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="pt-8 border-t border-brand-white/10 flex flex-col md:flex-row justify-between items-center text-sm text-brand-cream/40">
              <p>
                &copy; {new Date().getFullYear()} {copyrightText}
              </p>
              <div className="mt-4 md:mt-0 flex space-x-6">
                <Link href="#" className="hover:text-brand-cream/80 transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-brand-cream/80 transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </footer>
  );
}
