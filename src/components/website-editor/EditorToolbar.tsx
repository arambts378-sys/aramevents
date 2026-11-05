'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { copyToClipboard, publicWebsiteUrl } from '@/components/website-editor/WebsiteLinkField';

interface EditorToolbarProps {
  event: any;
  onPublish: () => void;
  publishing: boolean;
  setViewport: (viewport: string) => void;
  viewport: string;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  saveFailed: boolean;
  onRetrySave: () => void;
  isExpandedPreview: boolean;
  onToggleExpandPreview: () => void;
  activeMobileTab?: string;
  setActiveMobileTab?: (tab: string) => void;
}

export default function EditorToolbar({
  event,
  onPublish,
  publishing,
  setViewport,
  viewport,
  undo,
  redo,
  canUndo,
  canRedo,
  saving,
  saveFailed,
  onRetrySave,
  isExpandedPreview,
  onToggleExpandPreview,
  activeMobileTab,
  setActiveMobileTab,
}: EditorToolbarProps) {
  const websiteStatus = (event.website?.status || 'draft').toLowerCase();
  const isPublished = websiteStatus === 'published';
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    await copyToClipboard(publicWebsiteUrl(event.slug));
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <header className="min-h-[68px] bg-white border-b border-ds-line px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 z-30 shrink-0 select-none">
      {/* ================================================================= */}
      {/* LEFT: Back to Event, Breadcrumbs, Status Badge */}
      {/* ================================================================= */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <Link
          href={`/app/events/${event.id}`}
          className="inline-flex items-center gap-1.5 font-jakarta font-semibold text-[13px] text-ds-muted hover:text-ds-accent transition-colors py-1 group shrink-0"
          title="Back to Event Workspace"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">
            arrow_back
          </span>
          <span className="hidden sm:inline">Back to Event</span>
        </Link>

        <div className="h-4 w-px bg-ds-line shrink-0"></div>

        <div className="flex items-center gap-2 text-[14px] font-space min-w-0">
          <span className="text-ds-muted font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-[260px]">
            {event.name}
          </span>
          <span className="text-ds-line-strong">/</span>
          <span className="text-ds-ink font-bold hidden md:inline">Website Editor</span>
        </div>

        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider shrink-0 ${
            isPublished
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-ds-accent-soft text-ds-accent border border-ds-line'
          }`}
        >
          {isPublished ? 'PUBLISHED' : websiteStatus.toUpperCase()}
        </span>
      </div>

      {/* ================================================================= */}
      {/* CENTER: Device Viewport, Undo/Redo, Fullscreen Focus Toggle */}
      {/* ================================================================= */}
      <div className="order-3 flex w-full max-w-full items-center gap-2 overflow-x-auto py-1 lg:order-none lg:w-auto lg:gap-3">
        {/* Device Viewport Selector */}
        <div className="bg-ds-accent-soft/60 p-1 rounded-lg border border-ds-line flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] transition-all font-jakarta ${
              viewport === 'desktop'
                ? 'bg-white text-ds-accent shadow-xs border border-ds-line font-semibold'
                : 'text-ds-muted hover:text-ds-ink hover:bg-white/50'
            }`}
            title="Desktop Viewport (1280px)"
          >
            <span className="material-symbols-outlined text-[18px]">desktop_windows</span>
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport('tablet')}
            className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] transition-all font-jakarta ${
              viewport === 'tablet'
                ? 'bg-white text-ds-accent shadow-xs border border-ds-line font-semibold'
                : 'text-ds-muted hover:text-ds-ink hover:bg-white/50'
            }`}
            title="Tablet Viewport (768px)"
            aria-label="Tablet View"
          >
            <span className="material-symbols-outlined text-[18px]">tablet_mac</span>
            <span>Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] transition-all font-jakarta ${
              viewport === 'mobile'
                ? 'bg-white text-ds-accent shadow-xs border border-ds-line font-semibold'
                : 'text-ds-muted hover:text-ds-ink hover:bg-white/50'
            }`}
            title="Mobile Viewport (390px)"
            aria-label="Mobile View"
          >
            <span className="material-symbols-outlined text-[18px]">smartphone</span>
            <span>Mobile</span>
          </button>
        </div>

        <div className="h-4 w-px bg-ds-line"></div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={!canUndo}
            onClick={undo}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ds-muted hover:text-ds-ink hover:bg-ds-subtle disabled:text-ds-line-strong disabled:cursor-not-allowed transition-colors"
            title="Undo"
            aria-label="Undo"
          >
            <span className="material-symbols-outlined text-[18px]">undo</span>
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={redo}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ds-muted hover:text-ds-ink hover:bg-ds-subtle disabled:text-ds-line-strong disabled:cursor-not-allowed transition-colors"
            title="Redo"
            aria-label="Redo"
          >
            <span className="material-symbols-outlined text-[18px]">redo</span>
          </button>
        </div>

        <div className="h-4 w-px bg-ds-line"></div>

        {/* Full-Screen Preview Focus Toggle (Expand Preview / Exit Preview) */}
        <button
          type="button"
          onClick={onToggleExpandPreview}
          className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all font-jakarta shadow-2xs ${
            isExpandedPreview
              ? 'bg-ds-accent text-white border-ds-accent'
              : 'bg-white text-ds-ink border-ds-line hover:bg-ds-subtle hover:border-ds-accent/40'
          }`}
          title={isExpandedPreview ? 'Exit full-screen preview' : 'Expand preview to full screen'}
        >
          <span className="material-symbols-outlined text-[17px]">
            {isExpandedPreview ? 'fullscreen_exit' : 'fullscreen'}
          </span>
          <span>{isExpandedPreview ? 'Exit Preview' : 'Preview'}</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* RIGHT: Autosave Status, Copy Link, Publish Website Button */}
      {/* ================================================================= */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* Autosave status */}
        {saveFailed ? (
          <button
            type="button"
            onClick={onRetrySave}
            className="min-h-11 inline-flex items-center gap-1.5 text-[13px] font-semibold text-red-600 hover:underline font-jakarta"
          >
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>Not saved. Retry</span>
          </button>
        ) : (
          <div className="hidden xl:flex items-center gap-2 text-[13px] text-ds-muted font-jakarta">
            <span className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            <span>{saving ? 'Saving…' : 'Saved'}</span>
          </div>
        )}

        {/* Copy public link */}
        {isPublished && (
          <button
            type="button"
            onClick={handleCopyLink}
            className="min-h-11 px-3.5 py-2 rounded-lg border border-ds-line bg-white text-ds-ink font-semibold text-[13px] hover:bg-ds-subtle hover:border-ds-accent/40 transition-all shadow-xs font-jakarta inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[17px]">{linkCopied ? 'check' : 'link'}</span>
            <span className="hidden sm:inline" aria-live="polite">{linkCopied ? 'Copied' : 'Copy link'}</span>
          </button>
        )}

        {/* Publish Website button */}
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="min-h-11 px-3.5 sm:px-4 py-2 rounded-lg bg-ds-accent text-white font-semibold text-[13px] hover:bg-ds-accent-strong shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 font-jakarta"
        >
          <span className="material-symbols-outlined text-[18px]">
            {publishing ? 'sync' : 'language'}
          </span>
          <span className="hidden sm:inline">
            {publishing ? 'Publishing...' : isPublished ? 'Update Website' : 'Publish Website'}
          </span>
          <span className="sm:hidden">
            {publishing ? '...' : isPublished ? 'Update' : 'Publish'}
          </span>
        </button>
      </div>
    </header>
  );
}
