'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { templates } from '@/data/templates';
import EventWebsiteRenderer from '@/components/event/EventWebsiteRenderer';

interface WebsitePreviewProps {
  event: any;
  draft: any;
  viewport: string; // 'desktop' | 'tablet' | 'mobile'
  zoom: number | 'fit';
  activeSectionId: string | null;
  onSectionClick: (sectionId: string) => void;
}

export default function WebsitePreview({
  event,
  draft,
  viewport,
  zoom,
  activeSectionId,
  onSectionClick,
}: WebsitePreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [canvasWidth, setCanvasWidth] = useState<number>(1200);

  const template = templates.find((t) => t.id === draft.templateId) || templates[0];

  // Target viewport CSS widths
  const targetWidth =
    viewport === 'mobile' ? 390 : viewport === 'tablet' ? 768 : 1280;

  // Track canvas container width for responsive 'fit' calculation
  useEffect(() => {
    const updateCanvasWidth = () => {
      if (canvasRef.current) {
        setCanvasWidth(canvasRef.current.clientWidth);
      }
    };

    updateCanvasWidth();
    window.addEventListener('resize', updateCanvasWidth);

    let resizeObserver: ResizeObserver | null = null;
    if (canvasRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateCanvasWidth();
      });
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateCanvasWidth);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  // Measure content height with ResizeObserver
  useEffect(() => {
    if (!frameRef.current || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContentHeight(entry.contentRect.height);
        }
      }
    });

    ro.observe(frameRef.current);
    return () => ro.disconnect();
  }, [draft, viewport]);

  // Calculate effective visual scale
  const effectiveScale = (() => {
    if (zoom === 'fit') {
      const padding = canvasWidth < 768 ? 32 : 48;
      const available = Math.max(320, canvasWidth - padding);
      if (available < targetWidth) {
        return Math.max(0.35, available / targetWidth);
      }
      return 1;
    }
    return typeof zoom === 'number' ? zoom : 1;
  })();

  // Auto-scroll to selected section
  const scrollToActiveSection = useCallback(() => {
    if (!activeSectionId || !canvasRef.current) return;

    const sectionEl = document.getElementById(`preview-section-${activeSectionId}`);
    if (!sectionEl) return;

    try {
      sectionEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } catch {
      const container = canvasRef.current;
      const containerRect = container.getBoundingClientRect();
      const sectionRect = sectionEl.getBoundingClientRect();
      const offset = sectionRect.top - containerRect.top + container.scrollTop - 48;
      container.scrollTo({
        top: Math.max(0, offset),
        behavior: 'smooth',
      });
    }
  }, [activeSectionId]);

  useEffect(() => {
    // Slight timeout allows DOM re-render & layout to settle before smooth scroll
    const timer = setTimeout(() => {
      scrollToActiveSection();
    }, 60);
    return () => clearTimeout(timer);
  }, [activeSectionId, scrollToActiveSection]);

  const publicUrlSlug = event.slug || event.id || 'event';
  const displayHost =
    typeof window !== 'undefined' && window.location.host
      ? window.location.host.replace(/^www\./, '')
      : 'aram.events';
  const publicDisplayUrl = `${publicUrlSlug}.${displayHost}`;

  const isMobile = viewport === 'mobile';
  const isTablet = viewport === 'tablet';

  return (
    <div
      ref={canvasRef}
      className="preview-canvas flex-1 w-full h-full overflow-y-auto overflow-x-auto bg-[#F7F5FF] p-6 sm:p-8 flex flex-col items-center custom-scrollbar select-text"
    >
      {/* Visual Sizer Wrapper: exact scaled dimensions for zero clipping & true vertical scrolling */}
      <div
        className="preview-sizer transition-all duration-150 mx-auto"
        style={{
          width: `${targetWidth * effectiveScale}px`,
          height: contentHeight ? `${contentHeight * effectiveScale}px` : 'auto',
          minHeight: contentHeight ? `${contentHeight * effectiveScale}px` : 'auto',
          marginBottom: '64px',
        }}
      >
        {/* Scaled Frame Box */}
        <div
          ref={frameRef}
          style={{
            width: `${targetWidth}px`,
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'top left',
          }}
          className={`preview-scale-wrapper bg-white shadow-xl transition-all duration-150 flex flex-col ${
            isMobile
              ? 'rounded-[36px] border-[8px] border-[#17152B] overflow-hidden ring-1 ring-black/20'
              : 'rounded-xl border border-[#D5D0E5] overflow-hidden'
          }`}
        >
          {/* Compact Browser Frame Chrome */}
          {!isMobile ? (
            <div className="h-9 bg-[#F4F1FB] border-b border-[#E6E2F0] px-3.5 flex items-center justify-between select-none shrink-0">
              {/* Traffic Lights */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              </div>

              {/* Compact SSL URL Bar */}
              <div className="flex items-center gap-1.5 px-3 py-0.5 bg-white rounded-md border border-[#E6E2F0] text-[11px] font-mono text-[#77738A] shadow-2xs min-w-[220px] max-w-[340px] justify-center">
                <span className="material-symbols-outlined text-[13px] text-emerald-600">
                  lock
                </span>
                <span className="truncate text-[#17152B] font-medium tracking-tight">
                  {publicDisplayUrl}
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 text-[#77738A]">
                <button
                  type="button"
                  onClick={() => {
                    if (frameRef.current) {
                      setContentHeight(frameRef.current.offsetHeight);
                    }
                  }}
                  className="hover:text-[#17152B] transition-colors p-0.5 rounded"
                  title="Recalculate preview layout"
                >
                  <span className="material-symbols-outlined text-[15px]">refresh</span>
                </button>
                <Link
                  href={`/events/${publicUrlSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#7C5CFC] transition-colors p-0.5 rounded"
                  title="Open live website in new tab"
                >
                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Mobile Device Top Speaker / Notch & Mini Bar */
            <div className="bg-[#17152B] pt-2 pb-1.5 px-6 flex flex-col items-center select-none shrink-0">
              <div className="w-16 h-1 bg-white/20 rounded-full mb-2" />
              <div className="w-full flex items-center justify-between text-white/60 text-[10px] font-mono px-2">
                <span>9:41</span>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="material-symbols-outlined text-[12px]">signal_cellular_alt</span>
                  <span className="material-symbols-outlined text-[12px]">wifi</span>
                  <span className="material-symbols-outlined text-[12px]">battery_full</span>
                </div>
              </div>
            </div>
          )}

          {/* Actual Rendered Public Event Website (Full Natural Height) */}
          <div
            style={{
              backgroundColor: draft.theme?.colors?.background || template.colors.background,
              color: draft.theme?.colors?.text || template.colors.text,
            }}
            className="w-full text-[#17152B] flex-1 flex flex-col"
          >
            <EventWebsiteRenderer
              event={event}
              websiteConfig={draft}
              mode="editor"
              activeSectionId={activeSectionId}
              onSectionClick={onSectionClick}
            />
          </div>

          {/* Mobile Bottom Home Bar */}
          {isMobile && (
            <div className="bg-[#17152B] py-2 flex items-center justify-center shrink-0">
              <div className="w-24 h-1 bg-white/40 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
