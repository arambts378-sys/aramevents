'use client';

import React from 'react';

interface PeopleHeaderProps {
  onAddPerson: () => void;
  onOpenMobileMenu?: () => void;
}

export function PeopleHeader({ onAddPerson, onOpenMobileMenu }: PeopleHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-ds-line">
      <div className="flex items-start justify-between w-full sm:w-auto">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-ds-accent block mb-1">
            PEOPLE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-ds-ink tracking-tight">
            People
          </h1>
          <p className="text-xs sm:text-sm text-ds-muted mt-1 font-normal">
            Manage everyone connected to your events.
          </p>
        </div>

        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-ds-ink bg-white border border-ds-line rounded-xl shadow-xs hover:bg-ds-canvas transition-colors"
            aria-label="Open navigation menu"
          >
            <span className="material-symbols-outlined text-base">menu</span>
            <span>Menu</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={onAddPerson}
          id="btn-add-person"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ds-accent hover:bg-ds-accent-strong text-white text-xs sm:text-sm font-semibold transition-all duration-150 shadow-xs cursor-pointer active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>+ Add Person</span>
        </button>
      </div>
    </div>
  );
}
