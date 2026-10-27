'use client';

import React, { useState, useMemo } from 'react';
import {
  templates,
  colorPalettes,
  fontPairings,
  TemplateConfig,
  ThemeColors,
  ThemeTypography,
  ThemeLayout,
} from '@/data/templates';

interface TemplateGalleryProps {
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  theme: {
    colors?: ThemeColors;
    typography?: ThemeTypography;
    layout?: ThemeLayout;
  };
  onUpdateColors: (colors: ThemeColors) => void;
  onUpdateTypography: (typography: ThemeTypography) => void;
  onUpdateLayout: (layout: ThemeLayout) => void;
}

export default function TemplateGallery({
  selectedTemplateId,
  onSelectTemplate,
  theme,
  onUpdateColors,
  onUpdateTypography,
  onUpdateLayout,
}: TemplateGalleryProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'theme' | 'typography' | 'layout'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Active template lookup
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Active theme values with fallback to current template
  const activeColors: ThemeColors = theme.colors || currentTemplate.colors;
  const activeTypography: ThemeTypography = theme.typography || currentTemplate.typography;
  const activeLayout: ThemeLayout = theme.layout || currentTemplate.layout;

  // Categories list
  const categories = ['All', 'Conference', 'Corporate', 'Creative', 'Community', 'Sports', 'Wellness', 'Networking', 'Festival'];

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory =
        selectedCategory === 'All' || tpl.category.toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Handler for custom color change
  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    onUpdateColors({
      ...activeColors,
      [key]: value,
    });
  };

  // Render genuine structural miniature visual previews for each template
  const renderTemplateThumbnail = (tpl: TemplateConfig) => {
    const bg = tpl.colors.background;
    const pri = tpl.colors.primary;
    const acc = tpl.colors.accent;
    const text = tpl.colors.text;
    const border = tpl.colors.border;
    const surface = tpl.colors.surface || '#FFFFFF';

    // Shared mini header
    const renderMiniHeader = (isFloat = false) => (
      <div className={`flex items-center justify-between pb-1 ${isFloat ? 'px-2 py-0.5 rounded-full bg-white/80 shadow-2xs' : 'border-b'}`} style={{ borderColor: `${border}` }}>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pri }}></span>
          <span className="w-6 h-1 rounded" style={{ backgroundColor: text, opacity: 0.8 }}></span>
        </div>
        <div className="flex gap-1 items-center">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: text, opacity: 0.4 }}></span>
          <span className="w-5 h-1.5 rounded text-[5px] text-white flex items-center justify-center font-bold" style={{ backgroundColor: pri }}></span>
        </div>
      </div>
    );

    // Bespoke structural thumbnail layouts based on template ID
    let layoutContent = null;

    if (tpl.id === 'editorial') {
      // EDITORIAL: Asymmetric hero (text left, tall image right) + publication columns + spotlight speaker + timeline
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader()}
          <div className="grid grid-cols-12 gap-1 py-0.5 items-center">
            <div className="col-span-7 space-y-1">
              <span className="w-8 h-0.5 rounded block" style={{ backgroundColor: pri }}></span>
              <span className="w-full h-2 rounded font-serif font-bold block" style={{ backgroundColor: text }}></span>
              <span className="w-2/3 h-1 rounded block" style={{ backgroundColor: text, opacity: 0.5 }}></span>
            </div>
            <div className="col-span-5 h-8 rounded border" style={{ backgroundColor: surface, borderColor: border }}>
              <div className="w-full h-full bg-black/10 flex items-center justify-center text-[5px] font-mono">PORTRAIT</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-0.5 pt-0.5 border-t" style={{ borderColor: border }}>
            <span className="h-2 rounded bg-black/5"></span>
            <span className="h-2 rounded bg-black/5"></span>
            <span className="h-2 rounded bg-black/5"></span>
            <span className="h-2 rounded bg-black/5"></span>
          </div>
        </div>
      );
    } else if (tpl.id === 'executive') {
      // EXECUTIVE: Dark split screen + 4 metrics + leadership cards
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader()}
          <div className="grid grid-cols-2 gap-1 py-0.5 items-stretch">
            <div className="p-1 rounded space-y-1" style={{ backgroundColor: surface, borderColor: border }}>
              <span className="w-10 h-1.5 rounded block font-bold" style={{ backgroundColor: text }}></span>
              <span className="w-6 h-1 rounded block" style={{ backgroundColor: pri }}></span>
              <span className="w-8 h-1 rounded block" style={{ backgroundColor: text, opacity: 0.4 }}></span>
            </div>
            <div className="rounded p-1 flex flex-col justify-center items-center text-center" style={{ backgroundColor: pri, color: '#fff' }}>
              <span className="text-[6px] font-mono font-bold">SUMMIT</span>
              <span className="w-8 h-1 bg-white/60 rounded mt-0.5"></span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-0.5">
            <div className="h-3 rounded border text-center text-[5px] font-bold" style={{ backgroundColor: surface, borderColor: border }}>98%</div>
            <div className="h-3 rounded border text-center text-[5px] font-bold" style={{ backgroundColor: surface, borderColor: border }}>500+</div>
            <div className="h-3 rounded border text-center text-[5px] font-bold" style={{ backgroundColor: surface, borderColor: border }}>40+</div>
            <div className="h-3 rounded border text-center text-[5px] font-bold" style={{ backgroundColor: surface, borderColor: border }}>G20</div>
          </div>
        </div>
      );
    } else if (tpl.id === 'creative') {
      // CREATIVE: Raw border + manifesto box + staggered cards
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader()}
          <div className="border border-black p-1 space-y-0.5" style={{ backgroundColor: surface }}>
            <div className="flex justify-between items-center">
              <span className="text-[5px] font-mono uppercase font-bold" style={{ color: pri }}>// MANIFESTO</span>
              <span className="text-[5px] font-mono">01</span>
            </div>
            <span className="w-full h-2 rounded-none font-bold block" style={{ backgroundColor: text }}></span>
            <span className="w-3/4 h-1 rounded-none block" style={{ backgroundColor: text, opacity: 0.6 }}></span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="h-4 border border-black flex items-center justify-center text-[5px] font-mono font-bold" style={{ backgroundColor: text, color: '#fff' }}>#01</div>
            <div className="h-5 border border-black flex items-center justify-center text-[5px] font-mono font-bold" style={{ backgroundColor: pri, color: '#fff' }}>#02</div>
            <div className="h-4 border border-black flex items-center justify-center text-[5px] font-mono font-bold" style={{ backgroundColor: surface }}>#03</div>
          </div>
        </div>
      );
    } else if (tpl.id === 'conference') {
      // CONFERENCE: Banner hero + 3 ticket tiers + speaker grid
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader()}
          <div className="text-center py-0.5 space-y-0.5">
            <span className="inline-block px-1.5 py-0.5 rounded text-[5px] font-bold text-white" style={{ backgroundColor: pri }}>CONF 2027</span>
            <span className="w-3/4 h-1.5 rounded block mx-auto" style={{ backgroundColor: text }}></span>
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            <div className="p-0.5 rounded border text-center" style={{ backgroundColor: surface, borderColor: border }}>
              <span className="block text-[4px] font-bold">PASS A</span>
              <span className="block text-[5px] font-bold" style={{ color: pri }}>$199</span>
            </div>
            <div className="p-0.5 rounded border text-center ring-1 ring-black/20" style={{ backgroundColor: surface, borderColor: pri }}>
              <span className="block text-[4px] font-bold">ALL ACCESS</span>
              <span className="block text-[5px] font-bold" style={{ color: pri }}>$399</span>
            </div>
            <div className="p-0.5 rounded border text-center" style={{ backgroundColor: surface, borderColor: border }}>
              <span className="block text-[4px] font-bold">VIP</span>
              <span className="block text-[5px] font-bold" style={{ color: pri }}>$799</span>
            </div>
          </div>
          <div className="flex justify-between gap-0.5">
            <span className="w-3 h-3 rounded-full bg-black/10"></span>
            <span className="w-3 h-3 rounded-full bg-black/10"></span>
            <span className="w-3 h-3 rounded-full bg-black/10"></span>
            <span className="w-3 h-3 rounded-full bg-black/10"></span>
          </div>
        </div>
      );
    } else if (tpl.id === 'summit') {
      // SUMMIT: Cinematic dark + gold accents + invitation card
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1 text-white">
          {renderMiniHeader()}
          <div className="p-1.5 rounded border border-amber-500/30 text-center space-y-1" style={{ backgroundColor: '#13111C' }}>
            <span className="text-[5px] font-mono uppercase tracking-widest text-amber-400">GLOBAL SUMMIT</span>
            <span className="w-3/4 h-2 rounded block mx-auto bg-white"></span>
            <span className="inline-block px-2 py-0.5 rounded text-[5px] font-bold bg-amber-500 text-black">DELEGATE RSVP</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="h-3 rounded border border-white/10 bg-white/5 flex items-center justify-center text-[5px]">LUMINARY</div>
            <div className="h-3 rounded border border-white/10 bg-white/5 flex items-center justify-center text-[5px]">LUMINARY</div>
            <div className="h-3 rounded border border-white/10 bg-white/5 flex items-center justify-center text-[5px]">LUMINARY</div>
          </div>
        </div>
      );
    } else if (tpl.id === 'workshop') {
      // WORKSHOP: Outcome-focused + 3 learning cards + module syllabus
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader()}
          <div className="flex items-center justify-between py-0.5">
            <div className="space-y-0.5">
              <span className="text-[5px] font-mono text-emerald-600 font-bold block">HANDS-ON LAB</span>
              <span className="w-12 h-1.5 rounded block" style={{ backgroundColor: text }}></span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[5px] font-bold text-white bg-emerald-600">ENROLL</span>
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            <div className="p-0.5 rounded border bg-emerald-50 text-[4px] font-bold text-emerald-800">01 ARCH</div>
            <div className="p-0.5 rounded border bg-emerald-50 text-[4px] font-bold text-emerald-800">02 BUILD</div>
            <div className="p-0.5 rounded border bg-emerald-50 text-[4px] font-bold text-emerald-800">03 DEPLOY</div>
          </div>
          <div className="space-y-0.5">
            <div className="h-2 rounded border flex items-center px-1 text-[4px]" style={{ backgroundColor: surface }}>MOD 01: Core Frameworks</div>
            <div className="h-2 rounded border flex items-center px-1 text-[4px]" style={{ backgroundColor: surface }}>MOD 02: Hands-on Implementation</div>
          </div>
        </div>
      );
    } else if (tpl.id === 'networking') {
      // NETWORKING: Avatar circle clusters + conversation schedule
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader()}
          <div className="text-center py-0.5 space-y-0.5">
            <span className="w-10 h-1.5 rounded block mx-auto" style={{ backgroundColor: text }}></span>
            <span className="text-[5px] text-brand-muted">PEOPLE-FIRST SOCIAL GATHERING</span>
          </div>
          <div className="flex justify-center items-center -space-x-1 py-1">
            <span className="w-5 h-5 rounded-full border-2 border-white bg-purple-200"></span>
            <span className="w-5 h-5 rounded-full border-2 border-white bg-indigo-300"></span>
            <span className="w-5 h-5 rounded-full border-2 border-white bg-pink-300"></span>
            <span className="w-5 h-5 rounded-full border-2 border-white bg-amber-200"></span>
            <span className="w-5 h-5 rounded-full border-2 border-white bg-purple-400 text-[6px] font-bold text-white flex items-center justify-center">+50</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[4px] font-semibold">
            <div className="p-0.5 rounded border bg-white text-center">Roundtable A</div>
            <div className="p-0.5 rounded border bg-white text-center">Roundtable B</div>
          </div>
        </div>
      );
    } else if (tpl.id === 'festival') {
      // FESTIVAL: Poster hero + bold lineup typography
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader()}
          <div className="p-1 rounded border-2 border-black text-center space-y-0.5" style={{ backgroundColor: surface }}>
            <span className="text-[7px] font-bold uppercase tracking-tight block" style={{ color: text }}>HEADLINER 1 / HEADLINER 2</span>
            <span className="text-[5px] font-mono font-bold block" style={{ color: pri }}>ARTIST A · ARTIST B · ARTIST C</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="p-1 rounded border border-black text-center text-[5px] font-bold uppercase" style={{ backgroundColor: pri, color: '#fff' }}>STAGE 01</div>
            <div className="p-1 rounded border border-black text-center text-[5px] font-bold uppercase" style={{ backgroundColor: text, color: '#fff' }}>STAGE 02</div>
          </div>
          <div className="h-2 rounded bg-black flex items-center justify-center text-[4px] text-white font-mono uppercase font-bold">WEEKEND PASSES</div>
        </div>
      );
    } else if (tpl.id === 'sports') {
      // SPORTS: High-impact hero + race categories + timetable checkpoints
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader()}
          <div className="flex justify-between items-center py-0.5">
            <div className="space-y-0.5">
              <span className="text-[5px] font-mono uppercase font-bold text-red-600 block">RACE DAY TIMETABLE</span>
              <span className="w-10 h-2 rounded block font-bold" style={{ backgroundColor: text }}></span>
            </div>
            <span className="px-2 py-0.5 rounded text-[5px] font-bold text-white bg-red-600 uppercase">START LINE</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between p-0.5 rounded border bg-white text-[4px] font-mono">
              <span className="font-bold">#01 Check-in &amp; Bib Pick</span>
              <span className="text-red-600 font-bold">06:00 AM</span>
            </div>
            <div className="flex items-center justify-between p-0.5 rounded border bg-white text-[4px] font-mono">
              <span className="font-bold">#02 Wave 1 Flag Off</span>
              <span className="text-red-600 font-bold">06:30 AM</span>
            </div>
          </div>
          <div className="h-2.5 rounded bg-black text-white flex items-center justify-center text-[4px] font-bold font-mono uppercase">REGISTER FOR RACE</div>
        </div>
      );
    } else if (tpl.id === 'wellness') {
      // WELLNESS: Serene split + circular portraits + daily rhythm
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader(true)}
          <div className="text-center py-0.5 space-y-0.5">
            <span className="text-[5px] font-serif text-teal-800 italic block">Mindful Gathering</span>
            <span className="w-3/4 h-1.5 rounded-full block mx-auto" style={{ backgroundColor: text }}></span>
          </div>
          <div className="flex justify-center gap-2 py-0.5">
            <div className="flex flex-col items-center">
              <span className="w-4 h-4 rounded-full border border-teal-600/30 bg-teal-100 block"></span>
              <span className="text-[3px] text-teal-800 mt-0.5">Guide</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-4 h-4 rounded-full border border-teal-600/30 bg-teal-100 block"></span>
              <span className="text-[3px] text-teal-800 mt-0.5">Guide</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-4 h-4 rounded-full border border-teal-600/30 bg-teal-100 block"></span>
              <span className="text-[3px] text-teal-800 mt-0.5">Guide</span>
            </div>
          </div>
          <div className="h-2 rounded-full border border-teal-600/20 bg-teal-50 flex items-center justify-center text-[4px] text-teal-800 font-serif">Daily Rhythm Flow</div>
        </div>
      );
    } else if (tpl.id === 'corporate') {
      // CORPORATE: Enterprise pillars + leadership grid + corporate footer
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader()}
          <div className="p-1 rounded border space-y-0.5" style={{ backgroundColor: surface, borderColor: border }}>
            <span className="w-8 h-1 rounded block" style={{ backgroundColor: pri }}></span>
            <span className="w-full h-1.5 rounded block" style={{ backgroundColor: text }}></span>
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            <div className="h-3 rounded border text-center text-[4px] font-bold p-0.5" style={{ backgroundColor: surface, borderColor: border }}>GOVERNANCE</div>
            <div className="h-3 rounded border text-center text-[4px] font-bold p-0.5" style={{ backgroundColor: surface, borderColor: border }}>STRATEGY</div>
            <div className="h-3 rounded border text-center text-[4px] font-bold p-0.5" style={{ backgroundColor: surface, borderColor: border }}>VENTURES</div>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[4px] font-mono text-center">
            <div className="p-0.5 rounded border bg-white">C-Suite Keynotes</div>
            <div className="p-0.5 rounded border bg-white">Board Panels</div>
          </div>
        </div>
      );
    } else {
      // COMMUNITY / DEFAULT: Warm human story + friendly card flow
      layoutContent = (
        <div className="flex flex-col justify-between h-full space-y-1">
          {renderMiniHeader()}
          <div className="text-center py-0.5 space-y-0.5">
            <span className="text-[5px] font-bold block" style={{ color: pri }}>COMMUNITY STORY</span>
            <span className="w-3/4 h-1.5 rounded block mx-auto" style={{ backgroundColor: text }}></span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="p-1 rounded border bg-white space-y-0.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 block"></span>
              <span className="w-full h-1 rounded block bg-black/70"></span>
            </div>
            <div className="p-1 rounded border bg-white space-y-0.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 block"></span>
              <span className="w-full h-1 rounded block bg-black/70"></span>
            </div>
          </div>
          <div className="h-2 rounded bg-amber-600 text-white flex items-center justify-center text-[4px] font-bold">ALL ARE WELCOME</div>
        </div>
      );
    }

    return (
      <div
        style={{ backgroundColor: bg, borderColor: tpl.colors.border }}
        className="h-28 w-full rounded-lg border p-2 flex flex-col justify-between mb-3 overflow-hidden shadow-2xs relative select-none"
      >
        {layoutContent}
      </div>
    );
  };

  return (
    <div className="w-full bg-white flex flex-col select-none overflow-hidden h-full">
      {/* 1. Header with Mode Tabs */}
      <div className="p-4 border-b border-ds-line shrink-0 space-y-3">
        <div>
          <h2 className="text-[16px] font-bold text-ds-ink font-space">Design &amp; Styling</h2>
          <p className="text-[12px] text-ds-muted font-jakarta">
            Customize template, palette, typography and layout
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 p-0.5 bg-ds-accent-soft rounded-lg border border-ds-line">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              activeTab === 'templates'
                ? 'bg-white text-ds-accent shadow-xs'
                : 'text-ds-muted hover:text-ds-ink'
            }`}
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              activeTab === 'theme'
                ? 'bg-white text-ds-accent shadow-xs'
                : 'text-ds-muted hover:text-ds-ink'
            }`}
          >
            Theme
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={`py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              activeTab === 'typography'
                ? 'bg-white text-ds-accent shadow-xs'
                : 'text-ds-muted hover:text-ds-ink'
            }`}
          >
            Type
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              activeTab === 'layout'
                ? 'bg-white text-ds-accent shadow-xs'
                : 'text-ds-muted hover:text-ds-ink'
            }`}
          >
            Layout
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
        {/* =================================================================== */}
        {/* TAB 1: TEMPLATES GALLERY */}
        {/* =================================================================== */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <span className="material-symbols-outlined text-[16px] text-ds-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 12 templates..."
                className="w-full pl-9 pr-7 py-1.5 text-[12px] rounded-lg border border-ds-line bg-white text-ds-ink focus:border-ds-accent outline-none font-jakarta"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ds-muted hover:text-ds-ink"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                    selectedCategory === cat
                      ? 'bg-ds-accent text-white shadow-2xs'
                      : 'bg-ds-accent-soft text-ds-muted hover:text-ds-ink'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template Cards List */}
            <div className="space-y-3.5 pt-1">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((tpl) => {
                  const isActive = tpl.id === selectedTemplateId;

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => onSelectTemplate(tpl.id)}
                      className={`rounded-xl p-3 cursor-pointer transition-all duration-150 ${
                        isActive
                          ? 'border-2 border-ds-accent bg-white shadow-md ring-2 ring-ds-accent/20'
                          : 'border border-ds-line bg-white hover:border-ds-accent/50 hover:shadow-sm group'
                      }`}
                    >
                      {/* Thumbnail Preview */}
                      {renderTemplateThumbnail(tpl)}

                      {/* Header + Active Badge */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <h3
                            className={`text-[14px] font-bold font-space ${
                              isActive
                                ? 'text-ds-ink'
                                : 'text-ds-ink group-hover:text-ds-accent transition-colors'
                            }`}
                          >
                            {tpl.name}
                          </h3>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-ds-accent-soft text-ds-muted">
                            {tpl.category}
                          </span>
                        </div>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-jakarta text-ds-accent font-semibold bg-ds-accent-soft px-2 py-0.5 rounded-full">
                            <span className="material-symbols-outlined text-[12px]">check</span>
                            <span>Active</span>
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[12px] text-ds-muted font-jakarta leading-snug mb-2">
                        {tpl.description}
                      </p>

                      {/* Structural Composition Tags */}
                      {tpl.tags && tpl.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-ds-line/60">
                          {tpl.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-ds-accent-soft text-ds-body border border-ds-line"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center border border-dashed border-ds-line rounded-xl p-4 space-y-2">
                  <span className="material-symbols-outlined text-[24px] text-ds-muted">
                    search_off
                  </span>
                  <p className="text-[12px] font-semibold text-ds-ink">No templates found</p>
                  <p className="text-[11px] text-ds-muted">
                    Try searching for another keyword or clear the category filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: THEME & COLOR PALETTES */}
        {/* =================================================================== */}
        {activeTab === 'theme' && (
          <div className="space-y-6">
            {/* 1. Predefined Palettes */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-ds-muted font-jakarta">
                Predefined Palettes
              </h3>
              <div className="space-y-2">
                {colorPalettes.map((pal) => {
                  const isCurrent =
                    activeColors.primary === pal.colors.primary &&
                    activeColors.background === pal.colors.background;

                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => onUpdateColors(pal.colors)}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                        isCurrent
                          ? 'border-2 border-ds-accent bg-ds-accent-soft/40 shadow-xs'
                          : 'border-ds-line hover:border-ds-accent/40 bg-white'
                      }`}
                    >
                      <div>
                        <div className="text-[13px] font-semibold text-ds-ink font-space">
                          {pal.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: pal.colors.primary }}
                            title="Primary"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: pal.colors.secondary }}
                            title="Secondary"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: pal.colors.background }}
                            title="Background"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: pal.colors.accent }}
                            title="Accent"
                          />
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="material-symbols-outlined text-[18px] text-ds-accent">
                          check_circle
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Custom Color Controls */}
            <div className="pt-4 border-t border-ds-line space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-ds-muted font-jakarta">
                Custom Colors
              </h3>

              {/* Primary Color */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-ds-line bg-white">
                <label className="text-[12px] font-semibold text-ds-ink">Primary</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeColors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                    aria-label="Primary color picker"
                  />
                  <span className="font-mono text-[11px] text-ds-muted uppercase">
                    {activeColors.primary}
                  </span>
                </div>
              </div>

              {/* Secondary Color */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-ds-line bg-white">
                <label className="text-[12px] font-semibold text-ds-ink">Secondary</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeColors.secondary}
                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                    className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                    aria-label="Secondary color picker"
                  />
                  <span className="font-mono text-[11px] text-ds-muted uppercase">
                    {activeColors.secondary}
                  </span>
                </div>
              </div>

              {/* Background Color */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-ds-line bg-white">
                <label className="text-[12px] font-semibold text-ds-ink">Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeColors.background}
                    onChange={(e) => handleColorChange('background', e.target.value)}
                    className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                    aria-label="Background color picker"
                  />
                  <span className="font-mono text-[11px] text-ds-muted uppercase">
                    {activeColors.background}
                  </span>
                </div>
              </div>

              {/* Text Color */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-ds-line bg-white">
                <label className="text-[12px] font-semibold text-ds-ink">Text</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeColors.text}
                    onChange={(e) => handleColorChange('text', e.target.value)}
                    className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                    aria-label="Text color picker"
                  />
                  <span className="font-mono text-[11px] text-ds-muted uppercase">
                    {activeColors.text}
                  </span>
                </div>
              </div>

              {/* Accent Color */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-ds-line bg-white">
                <label className="text-[12px] font-semibold text-ds-ink">Accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeColors.accent}
                    onChange={(e) => handleColorChange('accent', e.target.value)}
                    className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                    aria-label="Accent color picker"
                  />
                  <span className="font-mono text-[11px] text-ds-muted uppercase">
                    {activeColors.accent}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: TYPOGRAPHY */}
        {/* =================================================================== */}
        {activeTab === 'typography' && (
          <div className="space-y-6">
            {/* Font Pairings */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-ds-muted font-jakarta">
                Font Pairing Presets
              </h3>
              <div className="space-y-2">
                {fontPairings.map((pair) => {
                  const isCurrent =
                    activeTypography.headingFont === pair.headingFont &&
                    activeTypography.bodyFont === pair.bodyFont;

                  return (
                    <button
                      key={pair.id}
                      type="button"
                      onClick={() =>
                        onUpdateTypography({
                          ...activeTypography,
                          headingFont: pair.headingFont,
                          bodyFont: pair.bodyFont,
                        })
                      }
                      className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                        isCurrent
                          ? 'border-2 border-ds-accent bg-ds-accent-soft/40 shadow-xs'
                          : 'border-ds-line hover:border-ds-accent/40 bg-white'
                      }`}
                    >
                      <div>
                        <div className="text-[13px] font-bold text-ds-ink">
                          {pair.name}
                        </div>
                        <div className="text-[11px] text-ds-muted mt-0.5">
                          {pair.headingFont} + {pair.bodyFont}
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="material-symbols-outlined text-[18px] text-ds-accent">
                          check_circle
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography Scale */}
            <div className="pt-4 border-t border-ds-line space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-ds-muted font-jakarta">
                Typography Scale
              </h3>

              {/* Heading Scale */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ds-ink block">
                  Heading Size Scale
                </label>
                <div className="grid grid-cols-3 gap-1 bg-ds-accent-soft p-1 rounded-lg border border-ds-line">
                  {(['compact', 'standard', 'large'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        onUpdateTypography({
                          ...activeTypography,
                          headingScale: s,
                        })
                      }
                      className={`py-1 rounded text-[11px] font-semibold capitalize transition-all ${
                        activeTypography.headingScale === s
                          ? 'bg-white text-ds-accent shadow-2xs'
                          : 'text-ds-muted hover:text-ds-ink'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Scale */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ds-ink block">
                  Body Size Scale
                </label>
                <div className="grid grid-cols-3 gap-1 bg-ds-accent-soft p-1 rounded-lg border border-ds-line">
                  {(['compact', 'standard', 'large'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        onUpdateTypography({
                          ...activeTypography,
                          bodyScale: s,
                        })
                      }
                      className={`py-1 rounded text-[11px] font-semibold capitalize transition-all ${
                        activeTypography.bodyScale === s
                          ? 'bg-white text-ds-accent shadow-2xs'
                          : 'text-ds-muted hover:text-ds-ink'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: LAYOUT & SPACING */}
        {/* =================================================================== */}
        {activeTab === 'layout' && (
          <div className="space-y-6">
            {/* Content Width */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ds-ink block">
                Content Max Width
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'compact', label: 'Compact (1024px)' },
                  { id: 'standard', label: 'Standard (1240px)' },
                  { id: 'wide', label: 'Wide (1440px)' },
                  { id: 'full', label: 'Full Width (100%)' },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() =>
                      onUpdateLayout({
                        ...activeLayout,
                        contentWidth: w.id as any,
                      })
                    }
                    className={`p-2 rounded-lg border text-[11px] font-semibold transition-all text-center ${
                      activeLayout.contentWidth === w.id
                        ? 'border-2 border-ds-accent bg-ds-accent-soft text-ds-accent'
                        : 'border-ds-line bg-white text-ds-muted hover:text-ds-ink'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Button Style */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ds-ink block">
                Button Corner Style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'sharp', label: 'Sharp' },
                  { id: 'rounded', label: 'Rounded' },
                  { id: 'pill', label: 'Pill' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      onUpdateLayout({
                        ...activeLayout,
                        buttonStyle: b.id as any,
                      })
                    }
                    className={`py-2 rounded-lg border text-[11px] font-semibold transition-all text-center ${
                      activeLayout.buttonStyle === b.id
                        ? 'border-2 border-ds-accent bg-ds-accent-soft text-ds-accent'
                        : 'border-ds-line bg-white text-ds-muted hover:text-ds-ink'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Style */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ds-ink block">
                Card Elevation Style
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'flat', label: 'Flat' },
                  { id: 'bordered', label: 'Bordered' },
                  { id: 'elevated', label: 'Elevated' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      onUpdateLayout({
                        ...activeLayout,
                        cardStyle: c.id as any,
                      })
                    }
                    className={`py-2 rounded-lg border text-[11px] font-semibold transition-all text-center ${
                      activeLayout.cardStyle === c.id
                        ? 'border-2 border-ds-accent bg-ds-accent-soft text-ds-accent'
                        : 'border-ds-line bg-white text-ds-muted hover:text-ds-ink'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spacing Density */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ds-ink block">
                Section Spacing Density
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'compact', label: 'Compact' },
                  { id: 'standard', label: 'Standard' },
                  { id: 'spacious', label: 'Spacious' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      onUpdateLayout({
                        ...activeLayout,
                        density: d.id as any,
                      })
                    }
                    className={`py-2 rounded-lg border text-[11px] font-semibold transition-all text-center ${
                      activeLayout.density === d.id
                        ? 'border-2 border-ds-accent bg-ds-accent-soft text-ds-accent'
                        : 'border-ds-line bg-white text-ds-muted hover:text-ds-ink'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
