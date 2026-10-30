'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import EditorToolbar from '@/components/website-editor/EditorToolbar';
import WebsitePreview from '@/components/website-editor/WebsitePreview';
import TemplateGallery from '@/components/website-editor/TemplateGallery';
import SectionPropertiesPanel from '@/components/website-editor/SectionPropertiesPanel';
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
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [isExpandedPreview, setIsExpandedPreview] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'sections' | 'preview' | 'templates'>('preview');
  const [leftPanelView, setLeftPanelView] = useState<'sections' | 'properties'>('sections');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

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

  const applyTemplateChange = (templateId: string, applyRecommendedOrder: boolean) => {
    const matched = templates.find((t) => t.id === templateId);
    if (!matched) return;

    let updatedSections = draft.sections;

    if (applyRecommendedOrder && matched.defaultSections && matched.defaultSections.length > 0) {
      const recSet = new Set(matched.defaultSections);

      // Order recommended sections according to template's recommended defaultSections sequence
      const orderedRecSections: any[] = [];
      matched.defaultSections.forEach((secId, idx) => {
        const found = draft.sections.find((s: any) => s.id === secId);
        if (found) {
          orderedRecSections.push({
            ...found,
            order: idx,
            visible: true,
          });
        }
      });

      // Append any remaining or custom sections with preserved order after recommended sections
      const otherSections = draft.sections
        .filter((s: any) => !recSet.has(s.id))
        .sort((a: any, b: any) => a.order - b.order)
        .map((s: any, idx: number) => ({
          ...s,
          order: orderedRecSections.length + idx,
        }));

      updatedSections = [...orderedRecSections, ...otherSections];
    }

    pushHistory({
      ...draft,
      templateId,
      theme: {
        colors: matched.colors,
        typography: matched.typography,
        layout: matched.layout,
      },
      sections: updatedSections,
    });

    setPendingTemplateId(null);
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === draft.templateId) return;
    const matched = templates.find((t) => t.id === templateId);
    if (!matched) return;

    // Check if current visible section order differs from recommended defaultSections
    const currentVisibleOrder = (draft.sections || [])
      .filter((s: any) => s.visible)
      .sort((a: any, b: any) => a.order - b.order)
      .map((s: any) => s.id);

    const isOrderDifferent =
      JSON.stringify(currentVisibleOrder) !== JSON.stringify(matched.defaultSections);

    if (isOrderDifferent) {
      setPendingTemplateId(templateId);
    } else {
      applyTemplateChange(templateId, true);
    }
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
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= ordered.length) return;

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

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateEvent({
        ...event,
        website: {
          ...event.website,
          draft,
        },
      });
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 2500);
    } catch (err) {
      console.error('Error saving draft:', err);
      alert('Failed to save website changes. Please try again.');
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
      setDraft(publishedState);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 2500);
    } catch (err) {
      console.error('Error publishing website:', err);
      alert('Failed to publish website. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const activeSection = draft.sections.find((s: any) => s.id === activeSectionId);
  const sortedSections = [...draft.sections].sort((a: any, b: any) => a.order - b.order);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-ds-canvas text-ds-ink antialiased select-none font-jakarta">
      {/* 1. TOP EDITOR TOOLBAR (~68px) */}
      <EditorToolbar
        event={event}
        onPublish={handlePublish}
        publishing={publishing}
        viewport={viewport}
        setViewport={setViewport}
        zoom={zoom}
        setZoom={setZoom}
        undo={undo}
        redo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        handleSave={handleSave}
        saving={saving}
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

      {/* Temporary Success Toast Notification */}
      {saveSuccessNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-ds-ink text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/10 animate-fade-in">
          <span className="material-symbols-outlined text-[18px] text-emerald-400">
            check_circle
          </span>
          <span>Changes successfully saved to website</span>
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
                    Sections ({draft.sections.length})
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
                      ({draft.sections.length})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Sections List or Active Section Properties Panel */}
            {leftPanelView === 'sections' || !activeSectionId ? (
              <>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                  {sortedSections.map((section: any, idx: number) => {
                    const isVisible = section.visible;
                    const isActive = section.id === activeSectionId;
                    const title = formatSectionTitle(section.id);

                    return (
                      <div
                        key={section.id}
                        onClick={() => {
                          setActiveSectionId(section.id);
                          if (window.innerWidth < 1280) {
                            setMobileTab('preview');
                          }
                        }}
                        className={`h-[46px] rounded-lg flex items-center justify-between px-3 transition-all group cursor-pointer border ${
                          isActive
                            ? 'bg-ds-accent-soft border-ds-accent text-ds-accent font-semibold shadow-xs'
                            : !isVisible
                            ? 'bg-white/60 border-ds-line text-ds-muted/70 opacity-60 hover:opacity-100 hover:bg-white'
                            : 'bg-white border-ds-line text-ds-ink hover:border-ds-accent/40 hover:bg-white'
                        }`}
                      >
                        {/* Left: Drag / Order Indicator + Name */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`material-symbols-outlined text-[17px] ${
                              isActive ? 'text-ds-accent' : 'text-ds-line-strong group-hover:text-ds-muted'
                            }`}
                          >
                            drag_indicator
                          </span>
                          <span className="text-[13px] truncate">{title}</span>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isActive && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLeftPanelView('properties');
                              }}
                              className="px-2 py-0.5 text-[11px] font-semibold bg-ds-accent text-white rounded-md hover:bg-ds-accent-strong transition-colors flex items-center gap-0.5 shadow-2xs mr-1"
                              title="Edit Section Content"
                            >
                              <span className="material-symbols-outlined text-[13px]">edit</span>
                              <span>Edit</span>
                            </button>
                          )}
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
                            disabled={idx === sortedSections.length - 1}
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
                            className={`p-0.5 transition-colors ${
                              isVisible
                                ? 'text-ds-muted hover:text-ds-accent'
                                : 'text-ds-line-strong hover:text-ds-ink'
                            }`}
                            title={isVisible ? 'Hide Section' : 'Show Section'}
                            aria-label={isVisible ? 'Hide Section' : 'Show Section'}
                          >
                            <span className="material-symbols-outlined text-[17px]">
                              {isVisible ? 'visibility' : 'visibility_off'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Left Sidebar Footer */}
                <div className="p-3 border-t border-ds-line bg-white text-center shrink-0">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-ds-muted">
                    <span className="material-symbols-outlined text-[14px]">touch_app</span>
                    <span>Click section to highlight &amp; scroll</span>
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
            event={event}
            draft={draft}
            viewport={viewport}
            zoom={zoom}
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

      {/* Template Switch Confirmation Dialog */}
      {pendingTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-ds-line space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-ds-accent-soft text-ds-accent flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">auto_awesome_mosaic</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-ds-ink font-space leading-snug">
                  Switching templates will apply the recommended section layout.
                </h3>
                <p className="text-xs text-ds-muted font-jakarta leading-relaxed">
                  Your event content will be preserved. Existing sections that are not part of this template remain available.
                </p>
              </div>
            </div>

            <div className="p-3 bg-ds-accent-soft/60 rounded-xl border border-ds-line text-xs font-mono space-y-1.5">
              <div className="text-[11px] font-bold text-ds-ink flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ds-accent"></span>
                <span>Template: {templates.find((t) => t.id === pendingTemplateId)?.name}</span>
              </div>
              <div className="text-[10px] text-ds-muted leading-relaxed">
                Recommended Order: {templates.find((t) => t.id === pendingTemplateId)?.defaultSections.map((s) => s.replace('_', ' ')).join(' → ')}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-ds-line">
              <button
                type="button"
                onClick={() => setPendingTemplateId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-ds-muted hover:text-ds-ink hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyTemplateChange(pendingTemplateId, false)}
                className="px-3.5 py-2 text-xs font-semibold text-ds-accent bg-ds-accent-soft hover:bg-ds-subtle rounded-lg transition-colors border border-ds-accent/20"
              >
                Keep Current Layout
              </button>
              <button
                type="button"
                onClick={() => applyTemplateChange(pendingTemplateId, true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-ds-accent hover:bg-ds-accent rounded-lg shadow-xs transition-colors"
              >
                Apply Recommended Layout
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
