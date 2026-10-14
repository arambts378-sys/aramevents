'use client';

import React from 'react';
import Link from 'next/link';

interface PersonDetailHeaderProps {
  fullName: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  jobTitle?: string | null;
  onEdit: () => void;
  onOpenMobileMenu?: () => void;
}

function getInitials(name: string): string {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function PersonDetailHeader({
  fullName,
  email,
  phone,
  organization,
  jobTitle,
  onEdit,
  onOpenMobileMenu,
}: PersonDetailHeaderProps) {
  const initials = getInitials(fullName);

  return (
    <div className="flex flex-col gap-4 pb-6 border-b border-[#E6E2F0]">
      {/* Top Navigation Row: Back Link & Mobile Menu */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/people"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#77738A] hover:text-[#7C5CFC] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>← Back to People</span>
        </Link>

        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#17152B] bg-white border border-[#E6E2F0] rounded-xl shadow-xs"
            aria-label="Open navigation menu"
          >
            <span className="material-symbols-outlined text-base">menu</span>
            <span>Menu</span>
          </button>
        )}
      </div>

      {/* Main Header Row: Avatar, Eyebrow, Full Name, Contact Tags, Edit CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#7C5CFC]/10 text-[#7C5CFC] font-extrabold flex items-center justify-center text-base shrink-0 border border-[#7C5CFC]/20 shadow-xs">
            {initials}
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#7C5CFC] block">
              PERSON
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17152B] tracking-tight truncate">
              {fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#77738A]">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#7C5CFC]">mail</span>
                <span className="truncate">{email}</span>
              </div>
              {phone && (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#7C5CFC]">call</span>
                  <span>{phone}</span>
                </div>
              )}
              {(organization || jobTitle) && (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#7C5CFC]">business</span>
                  <span>
                    {[jobTitle, organization].filter(Boolean).join(' at ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={onEdit}
            id="btn-edit-person"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#E6E2F0] hover:border-[#7C5CFC] text-[#17152B] hover:text-[#7C5CFC] text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>Edit Person</span>
          </button>
        </div>
      </div>
    </div>
  );
}
