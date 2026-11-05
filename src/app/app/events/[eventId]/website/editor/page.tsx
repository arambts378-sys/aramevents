'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import EditorToolbar from '@/components/website-editor/EditorToolbar';
import WebsitePreview from '@/components/website-editor/WebsitePreview';
import TemplateGallery from '@/components/website-editor/TemplateGallery';
import SectionPropertiesPanel from '@/components/website-editor/SectionPropertiesPanel';
import WebsiteLinkField from '@/components/website-editor/WebsiteLinkField';
import { createClient } from '@/lib/supabase/client';
import { templates, ThemeColors, ThemeTypography, ThemeLayout } from '@/data/templates';

const defaultSections = [
  { id: 'header', type: 'header', visible: true, order: 0 },
  { id: 'hero', type: 'hero', visible: true, order: 1 },
  { id: 'event_info', type: 'event_info', visible: true, order: 2 },
  { id: 'about', type: 'about', visible: true, order: 3 },
  { id: 'speakers', type: 'speakers', visible: true, order: 4 },
  { id: 'agenda', type: 'agenda', visible: true, order: 5 },
  { id: 'register', type: 'register', visible: true, order: 6 },
  { id: 'venue', type: 'venue', visible: true, order: 7 },
  { id: 'sponsors', type: 'sponsors', visible: true, order: 8 },
  { id: 'exhibitors', type: 'exhibitors', visible: true, order: 9 },
  { id: 'contact', type: 'contact', visible: true, order: 10 },
  { id: 'final_cta', type: 'final_cta', visible: true, order: 11 },
  { id: 'footer', type: 'footer', visible: true, order: 12 },
];

const formatSectionTitle = (id: string) => {
  switch (id) {
    case 'header':
      return 'Header';
    case 'hero':
      return 'Hero';
    case 'event_info':
      return 'Event Info';
    case 'about':
      return 'About';
    case 'speakers':
      return 'Speakers';
    case 'agenda':
      return 'Agenda';
    case 'register':
      return 'Register';
    case 'venue':
      return 'Venue';
    case 'sponsors':
      return 'Sponsors';
    case 'exhibitors':
      return 'Exhibitors';
    case 'contact':
      return 'Contact';
    case 'final_cta':
      return 'Final CTA';
    case 'footer':
      return 'Footer';
    default:
      return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

export default function EventWebsiteEditorPage() {
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, updateEvent, isHydrated } = useAppContext();

  const [publishing, setPublishing] = useState(false);
  const [viewport, setViewport] = useState('desktop');
  const [isExpandedPreview, setIsExpandedPreview] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'sections' | 'preview' | 'templates'>('preview');
  const [leftPanelView, setLeftPanelView] = useState<'sections' | 'properties'>('sections');
  const [saveFailed, setSaveFailed] = useState(false);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [showLiveDialog, setShowLiveDialog] = useState(false);
  // The last draft written to the database, and the latest state for saving on the way out.
  const savedDraft = useRef<any>(null);
  const latest = useRef<{ draft: any; event: any }>({ draft: null, event: null });

  const event = getEvent(eventId);

  useEffect(() => {
    if (event && !draft && history.length === 0) {
      let initialDraft = event.website?.draft;
      // Older events were saved with template ids that no longer exist (e.g. "minimal"); fall back
      // to a real template so the gallery shows a selection and the theme matches it.
      const resolveTemplate = (id?: string) => templates.find((t) => t.id === id) || templates[0];
      if (!initialDraft) {
        const tpl = resolveTemplate(event.website?.templateId);
        initialDraft = {
          templateId: tpl.id,
          status: 'draft',
          theme: {
            colors: tpl.colors,
            typography: tpl.typography,
            layout: tpl.layout,
          },
          sections: event.website?.sections?.length ? event.website.sections : defaultSections,
        };
      } else {
        const matchedTpl = resolveTemplate((initialDraft as any).templateId);
        const currentTheme = (initialDraft as any).theme || {};
        initialDraft = {
          ...initialDraft,
          templateId: matchedTpl.id,
          theme: {
            colors: matchedTpl.colors,
            typography: matchedTpl.typography,
            layout: matchedTpl.layout,
            ...currentTheme,
          },
        };
      }
      initialDraft = {
        ...initialDraft,
        sections: [...((initialDraft as any).sections || defaultSections)]
          .sort((a: any, b: any) => a.order - b.order)
          .map((s: any, idx: number) => ({ ...s, order: idx })),
      };
      setDraft(initialDraft);
      setHistory([initialDraft]);
      setHistoryIndex(0);
    }
  }, [event, draft, history]);

  useEffect(() => {
    latest.current = { draft, event };
  });

  // The same safe columns the public page shows, so the preview matches it
  useEffect(() => {
    if (!eventId) return;
    createClient()
      .from('event_sponsors')
      .select('id,name,kind,tier,website_url')
      .eq('event_id', eventId)
      .eq('show_on_website', true)
      .eq('request_status', 'approved')
      .order('created_at', { ascending: true })
      .then(({ data }) => setSponsors(data || []));
  }, [eventId]);

  // Save changes automatically, shortly after the organizer stops editing
  useEffect(() => {
    if (!draft || !event || publishing) return;
    if (savedDraft.current === null) {
      savedDraft.current = draft;
      return;
    }
    if (draft === savedDraft.current) return;

    const timer = setTimeout(async () => {
      try {
        setSaving(true);
        setSaveFailed(false);
        await updateEvent({ ...event, website: { ...event.website, draft } });
        savedDraft.current = draft;
      } catch (err) {
        console.error('Error saving draft:', err);
        setSaveFailed(true);
      } finally {
        setSaving(false);
      }
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, publishing]);

  // Don't lose an edit made just before leaving the editor
  useEffect(() => {
    return () => {
      const { draft: lastDraft, event: lastEvent } = latest.current;
      if (lastDraft && lastEvent && savedDraft.current && lastDraft !== savedDraft.current) {
        savedDraft.current = lastDraft;
        updateEvent({ ...lastEvent, website: { ...lastEvent.website, draft: lastDraft } }).catch((err) =>
          console.error('Error saving draft:', err)
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading Skeleton State
  if (!isHydrated) {
    return (
      <div className="h-screen bg-ds-canvas text-ds-ink flex flex-col overflow-hidden antialiased">
        <header className="h-[68px] bg-white border-b border-ds-line px-6 flex items-center justify-between animate-pulse">
          <div className="h-5 w-48 bg-ds-line rounded-md" />
          <div className="h-8 w-64 bg-ds-line rounded-lg" />
          <div className="h-9 w-32 bg-ds-line rounded-lg" />
        </header>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[280px] bg-white border-r border-ds-line p-4 space-y-3 animate-pulse">
            <div className="h-5 w-32 bg-ds-line rounded" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-ds-accent-soft rounded-lg" />
            ))}
          </div>
          <div className="flex-1 bg-ds-line p-8 flex items-center justify-center animate-pulse">
            <div className="w-full max-w-[1000px] h-[550px] bg-white rounded-xl border border-ds-line" />
          </div>
          <div className="w-[340px] bg-white border-l border-ds-line p-4 space-y-4 animate-pulse">
            <div className="h-5 w-28 bg-ds-line rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-ds-accent-soft rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Event Not Found State
  if (!event) {
    return (
      <div className="h-screen bg-ds-canvas text-ds-ink flex items-center justify-center p-6 antialiased">
        <div className="max-w-md w-full bg-white border border-ds-line rounded-2xl p-8 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-xl bg-ds-accent-soft text-ds-accent flex items-center justify-center mx-auto border border-ds-line">
            <span className="material-symbols-outlined text-[24px]">event_busy</span>
          </div>
          <h1 className="text-[20px] font-bold text-ds-ink font-space">Event Not Found</h1>
          <p className="text-[13px] text-ds-muted font-jakarta">
            The event for this website editor does not exist or has been removed.
          </p>
          <div className="pt-2">
            <Link
              href="/app/events"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-ds-accent hover:bg-ds-accent-strong text-white text-[13px] font-semibold rounded-lg transition-colors shadow-xs font-jakarta"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Events</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading Draft state
  if (!draft) {
    return (
      <div className="h-screen bg-ds-canvas text-ds-ink flex items-center justify-center p-6 antialiased">
        <div className="flex items-center gap-3 text-ds-muted font-jakarta text-[14px]">
          <span className="material-symbols-outlined animate-spin text-[20px] text-ds-accent">
            sync
          </span>
          <span>Loading Website Editor...</span>
        </div>
      </div>
    );
  }

  const pushHistory = (newDraft: any) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newDraft);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setDraft(newDraft);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setDraft(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setDraft(history[historyIndex + 1]);
    }
  };

  // Applies straight away and keeps the organizer's sections and content; Undo restores the old look.
  const handleTemplateSelect = (templateId: string) => {
    if (templateId === draft.templateId) return;
    const matched = templates.find((t) => t.id === templateId);
    if (!matched) return;

    pushHistory({
      ...draft,
      templateId,
      theme: {
        colors: matched.colors,
        typography: matched.typography,
        layout: matched.layout,
      },
    });
  };

  const handleUpdateColors = (newColors: ThemeColors) => {
    pushHistory({
      ...draft,
      theme: {
        ...(draft.theme || {}),
        colors: newColors,
      },
    });
  };

  const handleUpdateTypography = (newTypography: ThemeTypography) => {
    pushHistory({
      ...draft,
      theme: {
        ...(draft.theme || {}),
        typography: newTypography,
      },
    });
  };

  const handleUpdateLayout = (newLayout: ThemeLayout) => {
    pushHistory({
      ...draft,
      theme: {
        ...(draft.theme || {}),
        layout: newLayout,
      },
    });
  };

  const handleToggleSection = (sectionId: string) => {
    const newSections = draft.sections.map((s: any) =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    );
    pushHistory({ ...draft, sections: newSections });
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    // Work on the displayed (sorted) order, and copy the sections so earlier undo
    // snapshots are not changed in place.
    const ordered = [...draft.sections].sort((a: any, b: any) => a.order - b.order);
    const idx = ordered.findIndex((s: any) => s.id === sectionId);
    const step = direction === 'up' ? -1 : 1;
    let swapIdx = idx + step;
    while (ordered[swapIdx] && !ordered[swapIdx].visible) swapIdx += step;
    if (idx === -1 || !ordered[swapIdx]) return;

    [ordered[idx], ordered[swapIdx]] = [ordered[swapIdx], ordered[idx]];
    pushHistory({
      ...draft,
      sections: ordered.map((s: any, i: number) => ({ ...s, order: i })),
    });
  };

  const updateSectionConfig = (sectionId: string, updates: any) => {
    const newSections = draft.sections.map((s: any) => {
      if (s.id === sectionId) {
        return {
          ...s,
          content: { ...s.content, ...updates },
        };
      }
      return s;
    });
    pushHistory({ ...draft, sections: newSections });
  };

  const handleRetrySave = async () => {
    try {
      setSaving(true);
      setSaveFailed(false);
      await updateEvent({ ...event, website: { ...event.website, draft } });
      savedDraft.current = draft;
    } catch (err) {
      console.error('Error saving draft:', err);
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      const publishedState = { ...draft, status: 'published' };
      await updateEvent({
        ...event,
        website: {
          ...event.website,
          status: 'published',
          draft: publishedState,
          published: publishedState,
        },
      });
      savedDraft.current = publishedState;
      setDraft(publishedState);
      setSaveFailed(false);
      setShowLiveDialog(true);
    } catch (err) {
      console.error('Error publishing website:', err);
      alert('Failed to publish website. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const activeSection = draft.sections.find((s: any) => s.id === activeSectionId);
  const sortedSections = [...draft.sections].sort((a: any, b: any) => a.order - b.order);
  const shownSections = sortedSections.filter((s: any) => s.visible);
  const hiddenSections = sortedSections.filter((s: any) => !s.visible);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-ds-canvas text-ds-ink antialiased select-none font-jakarta">
      {/* 1. TOP EDITOR TOOLBAR (~68px) */}
      <EditorToolbar
        event={event}
        onPublish={handlePublish}
        publishing={publishing}
        viewport={viewport}
        setViewport={setViewport}
        undo={undo}
        redo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        saving={saving}
        saveFailed={saveFailed}
        onRetrySave={handleRetrySave}
        isExpandedPreview={isExpandedPreview}
        onToggleExpandPreview={() => setIsExpandedPreview((prev) => !prev)}
        activeMobileTab={mobileTab}
        setActiveMobileTab={(tab) => setMobileTab(tab as 'sections' | 'preview' | 'templates')}
      />

      {/* Responsive Panel Switcher for Viewports < 1280px (hidden in expand focus mode) */}
      {!isExpandedPreview && (
        <div className="xl:hidden flex items-center justify-around border-b border-ds-line bg-white px-2 py-1.5 text-[12px] font-semibold shrink-0 z-20">
          <button
            type="button"
            onClick={() => setMobileTab('sections')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              mobileTab === 'sections'
                ? 'bg-ds-accent-soft text-ds-accent'
                : 'text-ds-muted hover:text-ds-ink'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">view_list</span>
            <span>SECTIONS</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              mobileTab === 'preview'
                ? 'bg-ds-accent-soft text-ds-accent'
                : 'text-ds-muted hover:text-ds-ink'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">preview</span>
            <span>PREVIEW</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('templates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              mobileTab === 'templates'
                ? 'bg-ds-accent-soft text-ds-accent'
                : 'text-ds-muted hover:text-ds-ink'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">palette</span>
            <span>DESIGN</span>
          </button>
        </div>
      )}

      {/* 2. THREE-PANEL WORKSPACE (Height: 100vh - 68px, Full-Height & Zero Page-Level Scrolling) */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* =================================================================== */}
        {/* LEFT SIDEBAR: Website Sections & Settings (~280px) */}
        {/* =================================================================== */}
        {!isExpandedPreview && (
          <aside
            className={`w-full xl:w-[280px] bg-ds-canvas border-r border-ds-line flex flex-col shrink-0 min-h-0 overflow-hidden z-10 transition-all ${
              mobileTab === 'sections' ? 'flex' : 'hidden xl:flex'
            }`}
          >
            {/* Header */}
            <div className="p-3.5 border-b border-ds-line bg-white shrink-0">
              {activeSectionId ? (
                <div className="flex items-center gap-1 p-0.5 bg-ds-accent-soft rounded-lg border border-ds-line">
                  <button
                    type="button"
                    onClick={() => setLeftPanelView('sections')}
                    className={`flex-1 py-1 text-center rounded-md text-[11px] font-semibold transition-all ${
                      leftPanelView === 'sections'
                        ? 'bg-white text-ds-accent shadow-xs'
                        : 'text-ds-muted hover:text-ds-ink'
                    }`}
                  >
                    Sections ({shownSections.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftPanelView('properties')}
                    className={`flex-1 py-1 text-center rounded-md text-[11px] font-semibold transition-all ${
                      leftPanelView === 'properties'
                        ? 'bg-white text-ds-accent shadow-xs'
                        : 'text-ds-muted hover:text-ds-ink'
                    }`}
                  >
                    Edit: {formatSectionTitle(activeSectionId)}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-[14px] font-bold text-ds-ink font-space">Website Sections</h2>
                    <span className="text-[11px] font-mono font-semibold text-ds-muted">
                      ({shownSections.length})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Sections List or Active Section Properties Panel */}
            {leftPanelView === 'sections' || !activeSectionId ? (
              <>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                  {shownSections.map((section: any, idx: number) => {
                    const isActive = section.id === activeSectionId;

                    return (
                      <div
                        key={section.id}
                        onClick={() => {
                          setActiveSectionId(section.id);
                          setLeftPanelView('properties');
                        }}
                        className={`h-[46px] rounded-lg flex items-center justify-between px-3 transition-all group cursor-pointer border ${
                          isActive
                            ? 'bg-ds-accent-soft border-ds-accent text-ds-accent font-semibold shadow-xs'
                            : 'bg-white border-ds-line text-ds-ink hover:border-ds-accent/40 hover:bg-white'
                        }`}
                      >
                        <span className="text-[13px] truncate min-w-0">{formatSectionTitle(section.id)}</span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveSection(section.id, 'up');
                            }}
                            disabled={idx === 0}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-ds-muted hover:text-ds-accent disabled:opacity-20 transition-opacity"
                            title="Move section up"
                            aria-label="Move section up"
                          >
                            <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveSection(section.id, 'down');
                            }}
                            disabled={idx === shownSections.length - 1}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-ds-muted hover:text-ds-accent disabled:opacity-20 transition-opacity"
                            title="Move section down"
                            aria-label="Move section down"
                          >
                            <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSection(section.id);
                            }}
                            className="p-0.5 text-ds-muted hover:text-ds-accent transition-colors"
                            title="Hide section"
                            aria-label={`Hide ${formatSectionTitle(section.id)} section`}
                          >
                            <span className="material-symbols-outlined text-[17px]">visibility</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {hiddenSections.length > 0 && (
                    <div className="pt-3">
                      <h3 className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-ds-muted">
                        Add a section
                      </h3>
                      <div className="space-y-1.5">
                        {hiddenSections.map((section: any) => (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => {
                              handleToggleSection(section.id);
                              setActiveSectionId(section.id);
                              setLeftPanelView('properties');
                            }}
                            className="w-full h-[40px] rounded-lg flex items-center justify-between px-3 border border-dashed border-ds-line text-[13px] text-ds-muted hover:border-ds-accent hover:text-ds-accent transition-colors"
                          >
                            <span className="truncate">{formatSectionTitle(section.id)}</span>
                            <span className="material-symbols-outlined text-[17px] shrink-0" aria-hidden="true">add</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Left Sidebar Footer */}
                <div className="p-3 border-t border-ds-line bg-white text-center shrink-0">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-ds-muted">
                    <span className="material-symbols-outlined text-[14px]">touch_app</span>
                    <span>Click a section to edit it</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white min-h-0">
                <div className="flex items-center justify-between pb-3 border-b border-ds-line">
                  <button
                    type="button"
                    onClick={() => setLeftPanelView('sections')}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-ds-accent hover:text-ds-accent-strong transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                    <span>All Sections</span>
                  </button>
                  <span className="text-[11px] font-mono font-semibold text-ds-muted uppercase">
                    {formatSectionTitle(activeSectionId || '')}
                  </span>
                </div>
                <SectionPropertiesPanel
                  section={activeSection}
                  updateSection={(updates: any) => updateSectionConfig(activeSectionId, updates)}
                  eventId={eventId}
                  workspaceId={event.workspace_id}
                />
              </div>
            )}
          </aside>
        )}

        {/* =================================================================== */}
        {/* CENTER CANVAS: Website Preview Canvas (flex-1, full remaining width) */}
        {/* =================================================================== */}
        <div
          className={`flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col ${
            mobileTab === 'preview' || isExpandedPreview ? 'flex' : 'hidden xl:flex'
          }`}
        >
          <WebsitePreview
            event={{ ...event, sponsors }}
            draft={draft}
            viewport={viewport}
            zoom="fit"
            activeSectionId={activeSectionId}
            onSectionClick={(sectionId) => {
              setActiveSectionId(sectionId);
              setLeftPanelView('properties');
              if (window.innerWidth < 1280) {
                setMobileTab('sections');
              }
            }}
          />
        </div>

        {/* =================================================================== */}
        {/* RIGHT SIDEBAR: Templates & Styling (~340px) */}
        {/* =================================================================== */}
        {!isExpandedPreview && (
          <aside
            className={`w-full xl:w-[340px] bg-white border-l border-ds-line flex flex-col shrink-0 min-h-0 overflow-hidden z-10 ${
              mobileTab === 'templates' ? 'flex' : 'hidden xl:flex'
            }`}
          >
            <TemplateGallery
              selectedTemplateId={draft.templateId}
              onSelectTemplate={handleTemplateSelect}
              theme={draft.theme || {}}
              onUpdateColors={handleUpdateColors}
              onUpdateTypography={handleUpdateTypography}
              onUpdateLayout={handleUpdateLayout}
            />
          </aside>
        )}

      {/* Shown after publishing, with the link to share */}
      {showLiveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="website-live-title"
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-ds-line space-y-4 select-text"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">check_circle</span>
              </div>
              <div className="space-y-1">
                <h3 id="website-live-title" className="text-base font-bold text-ds-ink font-space leading-snug">
                  Your website is live
                </h3>
                <p className="text-xs text-ds-muted font-jakarta leading-relaxed">
                  Copy this link and share it anywhere: email, WhatsApp or social media.
                </p>
              </div>
            </div>

            <WebsiteLinkField slug={event.slug} />

            <div className="flex justify-end pt-2 border-t border-ds-line">
              <button
                type="button"
                onClick={() => setShowLiveDialog(false)}
                className="px-3.5 py-2 text-xs font-semibold text-ds-muted hover:text-ds-ink hover:bg-gray-100 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
