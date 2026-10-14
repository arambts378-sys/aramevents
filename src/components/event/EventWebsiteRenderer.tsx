'use client';

import React from 'react';
import Header from "@/components/event/Header";
import Hero from "@/components/event/Hero";
import EventInfo from "@/components/event/EventInfo";
import About from "@/components/event/About";
import Speakers from "@/components/event/Speakers";
import Agenda from "@/components/event/Agenda";
import Registration from "@/components/event/Registration";
import Venue from "@/components/event/Venue";
import Sponsors from "@/components/event/Sponsors";
import Exhibitors from "@/components/event/Exhibitors";
import Contact from "@/components/event/Contact";
import FinalCTA from "@/components/event/FinalCTA";
import Footer from "@/components/event/Footer";
import { templates } from "@/data/templates";

export type WebsiteRendererMode = 'editor' | 'preview' | 'public';

interface Props {
  event: any;
  websiteConfig: any;
  mode: WebsiteRendererMode;
  activeSectionId?: string | null;
  onSectionClick?: (sectionId: string) => void;
}

export default function EventWebsiteRenderer({
  event,
  websiteConfig,
  mode,
  activeSectionId,
  onSectionClick,
}: Props) {
  // Resolve active template and theme
  const template =
    templates.find((t) => t.id === websiteConfig?.templateId) || templates[0];
  const theme = websiteConfig?.theme || {};
  const colors = theme.colors || template.colors;
  const typography = theme.typography || template.typography;
  const layout = theme.layout || template.layout;

  // Resolve CSS font-family variables
  const resolveFont = (fontName?: string) => {
    switch (fontName) {
      case 'Space Grotesk':
        return 'var(--font-space-grotesk), sans-serif';
      case 'Plus Jakarta Sans':
        return 'var(--font-plus-jakarta-sans), sans-serif';
      case 'Inter':
        return 'var(--font-inter), sans-serif';
      default:
        return 'var(--font-plus-jakarta-sans), sans-serif';
    }
  };

  const headingFont = resolveFont(typography.headingFont);
  const bodyFont = resolveFont(typography.bodyFont);

  // Button radius
  const buttonRadius =
    layout.buttonStyle === 'pill'
      ? '9999px'
      : layout.buttonStyle === 'sharp'
      ? '0px'
      : '8px';

  // Card radius
  const cardRadius =
    layout.cardStyle === 'elevated'
      ? '16px'
      : layout.cardStyle === 'bordered'
      ? '12px'
      : '8px';

  // Content max-width
  const contentWidth =
    layout.contentWidth === 'compact'
      ? '1024px'
      : layout.contentWidth === 'wide'
      ? '1440px'
      : layout.contentWidth === 'full'
      ? '100%'
      : '1240px';

  // Typography scale factors
  const headingScale =
    typography.headingScale === 'large'
      ? '1.15'
      : typography.headingScale === 'compact'
      ? '0.9'
      : '1.0';

  const bodyScale =
    typography.bodyScale === 'large'
      ? '1.1'
      : typography.bodyScale === 'compact'
      ? '0.92'
      : '1.0';

  const spacingScale =
    layout.density === 'spacious'
      ? '1.25'
      : layout.density === 'compact'
      ? '0.85'
      : '1.0';

  const themeStyle = {
    '--website-primary': colors.primary,
    '--website-secondary': colors.secondary,
    '--website-background': colors.background,
    '--website-surface': colors.surface || '#FFFFFF',
    '--website-text': colors.text,
    '--website-accent': colors.accent,
    '--website-border': colors.border,
    '--website-muted': colors.muted,
    '--website-content-width': contentWidth,
    '--website-button-radius': buttonRadius,
    '--website-card-radius': cardRadius,
    '--website-heading-scale': headingScale,
    '--website-body-scale': bodyScale,
    '--website-spacing': spacingScale,

    // Legacy brand variable mappings
    '--color-brand-maroon': colors.primary,
    '--color-brand-deep': colors.secondary,
    '--color-brand-cream': colors.background,
    '--color-brand-soft': colors.background,
    '--color-brand-white': colors.surface || '#FFFFFF',
    '--color-brand-dark': colors.text,
    '--color-brand-border': colors.border,
    '--color-brand-muted': colors.muted,

    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: bodyFont,
  } as React.CSSProperties;

  const visibleSections =
    websiteConfig?.sections
      ?.filter((s: any) => s.visible)
      ?.sort((a: any, b: any) => a.order - b.order) || [];

  const variants = template.variants || {
    header: 'sticky-blur',
    hero: 'centered',
    eventInfo: 'stats-strip',
    about: 'split',
    speakers: 'grid',
    agenda: 'timeline',
    venue: 'split',
    sponsors: 'grid',
    exhibitors: 'grid',
    register: 'split',
    contact: 'split',
    footer: 'split',
  };

  const renderSectionComponent = (section: any) => {
    switch (section.id) {
      case 'header':
        return <Header event={event} section={section} websiteConfig={websiteConfig} variant={variants.header} />;
      case 'home':
      case 'hero':
        return <Hero event={event} section={section} variant={variants.hero} />;
      case 'event_info':
        return <EventInfo event={event} section={section} variant={variants.eventInfo} />;
      case 'about':
        return <About event={event} section={section} variant={variants.about} />;
      case 'speakers':
        return <Speakers event={event} section={section} variant={variants.speakers} />;
      case 'agenda':
        return <Agenda event={event} section={section} variant={variants.agenda} />;
      case 'register':
        return <Registration event={event} section={section} variant={variants.register} />;
      case 'venue':
        return <Venue event={event} section={section} variant={variants.venue} />;
      case 'sponsors':
        return <Sponsors event={event} section={section} />;
      case 'exhibitors':
        return <Exhibitors event={event} section={section} />;
      case 'contact':
        return <Contact event={event} section={section} />;
      case 'final_cta':
        return <FinalCTA event={event} section={section} />;
      case 'footer':
        return <Footer event={event} section={section} variant={variants.footer} />;
      default:
        return null;
    }
  };

  return (
    <div
      style={themeStyle}
      className="website-renderer-root w-full flex flex-col relative transition-colors duration-200"
    >
      <style>{`
        .website-renderer-root h1, 
        .website-renderer-root h2, 
        .website-renderer-root h3, 
        .website-renderer-root h4 {
          font-family: ${headingFont} !important;
        }
        .website-renderer-root button,
        .website-renderer-root a[class*="rounded"] {
          border-radius: var(--website-button-radius) !important;
        }
        .website-renderer-root .max-w-7xl,
        .website-renderer-root .max-w-4xl {
          max-width: var(--website-content-width) !important;
        }
      `}</style>

      {visibleSections.map((section: any) => {
        const isSelected = mode === 'editor' && activeSectionId === section.id;
        const component = renderSectionComponent(section);

        if (!component) return null;

        if (mode === 'editor') {
          return (
            <div
              key={section.id}
              id={`preview-section-${section.id}`}
              data-section-id={section.id}
              className={`relative cursor-pointer transition-all duration-200 group ${
                isSelected
                  ? 'outline outline-[2px] outline-[#7C5CFC] outline-offset-[-2px] z-40'
                  : 'hover:outline hover:outline-1 hover:outline-[#7C5CFC]/60 hover:outline-offset-[-1px]'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (onSectionClick) onSectionClick(section.id);
              }}
            >
              {isSelected && (
                <div className="absolute -top-3.5 left-6 z-50 flex items-center shadow-md rounded-full overflow-hidden border border-[#7C5CFC]/30 select-none">
                  <div className="bg-[#7C5CFC] text-white text-[11px] font-semibold px-3 py-1 flex items-center gap-1.5 tracking-wide uppercase font-mono">
                    <span className="material-symbols-outlined text-[14px]">layers</span>
                    <span>{section.id.replace('_', ' ')} · ACTIVE SECTION</span>
                  </div>
                  <div className="bg-white px-2.5 py-0.5 flex items-center gap-1 border-l border-[#7C5CFC]/20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSectionClick) onSectionClick(section.id);
                      }}
                      className="px-1.5 py-0.5 text-[11px] text-[#17152B] hover:text-[#7C5CFC] hover:bg-[#F6F1FF] rounded transition-colors flex items-center gap-1 font-semibold"
                    >
                      <span className="material-symbols-outlined text-[13px]">edit</span>
                      <span>Edit Content</span>
                    </button>
                  </div>
                </div>
              )}
              {!isSelected && (
                <div className="absolute top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 bg-white text-[#7C5CFC] text-[11px] font-semibold px-2.5 py-1 rounded-full font-jakarta shadow-md border border-[#7C5CFC]/30">
                    <span className="material-symbols-outlined text-[13px]">edit</span>
                    <span>Edit Section</span>
                  </span>
                </div>
              )}
              <div className={isSelected ? 'opacity-100' : 'opacity-95 group-hover:opacity-100'}>
                {component}
              </div>
            </div>
          );
        }

        return <React.Fragment key={section.id}>{component}</React.Fragment>;
      })}
    </div>
  );
}
