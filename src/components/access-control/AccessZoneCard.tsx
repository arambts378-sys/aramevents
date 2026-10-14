'use client';

import React from 'react';
import Link from 'next/link';

export interface AccessZoneData {
  id: string;
  event_id: string;
  name: string;
  zone_type: string;
  description?: string | null;
  location?: string | null;
  requires_qr: boolean;
  allow_reentry: boolean;
  entitlement_limit?: number | null;
  entitlement_unit?: string | null;
  is_active: boolean;
  checkpoint_type?: string | null;
  distance_km?: number | null;
  sequence?: number | null;
  created_at?: string;
}

interface AccessZoneCardProps {
  zone: AccessZoneData;
  eventId: string;
  assignedScannersCount: number;
  todayScansCount: number;
  onEdit: (zone: AccessZoneData) => void;
  onToggleActive: (zoneId: string, currentStatus: boolean) => void;
  onDelete: (zone: AccessZoneData) => void;
}

function getZoneIcon(zoneType: string) {
  switch (zoneType) {
    case 'Gate':
      return 'door_sliding';
    case 'Food Court':
      return 'restaurant';
    case 'VIP':
      return 'stars';
    case 'Walkathon Checkpoint':
      return 'directions_run';
    case 'Workshop':
      return 'school';
    case 'Backstage':
      return 'lock';
    case 'Checkpoint':
    default:
      return 'verified_user';
  }
}

export function AccessZoneCard({
  zone,
  eventId,
  assignedScannersCount,
  todayScansCount,
  onEdit,
  onToggleActive,
  onDelete,
}: AccessZoneCardProps) {
  const icon = getZoneIcon(zone.zone_type);

  // Derive entitlements description
  let entitlementText = 'All Confirmed Attendees';
  if (zone.zone_type === 'Food Court' && zone.entitlement_limit) {
    entitlementText = `Allocation: ${zone.entitlement_limit} ${zone.entitlement_unit || 'Meals'}`;
  } else if (zone.zone_type === 'Walkathon Checkpoint' && zone.checkpoint_type) {
    entitlementText = `Walkathon: ${zone.checkpoint_type} (${zone.distance_km ?? 0} KM${
      zone.sequence ? `, Seq ${zone.sequence}` : ''
    })`;
  } else if (zone.requires_qr && zone.allow_reentry) {
    entitlementText = 'QR Validation · Re-entry Allowed';
  } else if (zone.requires_qr && !zone.allow_reentry) {
    entitlementText = 'QR Validation · Single Entry';
  } else if (!zone.requires_qr) {
    entitlementText = 'Open Checkpoint (No QR Required)';
  }

  return (
    <div className="border border-[#E6E2F0] rounded-xl p-5 hover:border-[#7C5CFC]/40 bg-white hover:bg-[#F6F1FF]/20 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      {/* Left side: Icon + Zone info */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#E5DEFF]/60 flex items-center justify-center text-[#7C5CFC] flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-space text-[17px] text-[#17152B] font-bold leading-tight">
              {zone.name}
            </h3>

            {/* Zone Type Badge */}
            <span className="px-2 py-0.5 rounded-md bg-[#F6F1FF] text-[#7C5CFC] text-[11px] font-mono uppercase font-bold tracking-wider">
              {zone.zone_type}
            </span>

            {/* Status Badge */}
            {zone.is_active ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-mono font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-mono font-bold border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                INACTIVE
              </span>
            )}
          </div>

          {/* Description */}
          {zone.description && (
            <p className="font-jakarta text-[13px] text-[#77738A] mt-1 line-clamp-2">
              {zone.description}
            </p>
          )}

          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 mt-2 text-[#77738A] font-jakarta text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#7C5CFC]">passkey</span>
              <span className="text-[#17152B] font-medium">{entitlementText}</span>
            </div>

            <span className="text-[#E6E2F0]">•</span>

            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#7C5CFC]">devices</span>
              <span className="text-[#17152B] font-medium">
                {assignedScannersCount > 0
                  ? `${assignedScannersCount} Scanner${assignedScannersCount === 1 ? '' : 's'} Assigned`
                  : 'No Scanners Assigned'}
              </span>
            </div>

            {zone.location && (
              <>
                <span className="text-[#E6E2F0]">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#7C5CFC]">location_on</span>
                  <span className="text-[#17152B] font-medium">{zone.location}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Scans count & Actions */}
      <div className="flex flex-wrap items-center justify-between xl:justify-end gap-6 pt-3 xl:pt-0 border-t xl:border-t-0 border-[#E6E2F0]/60 shrink-0">
        {/* Today's Scans Metric */}
        <div className="flex flex-col xl:items-end">
          <span className="font-mono text-[11px] text-[#77738A] uppercase font-bold tracking-wider">
            TODAY&apos;S SCANS
          </span>
          <span className="font-space text-[18px] font-bold text-[#17152B]">
            {todayScansCount.toLocaleString()} {todayScansCount === 1 ? 'scan' : 'scans'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {zone.is_active ? (
            <button
              type="button"
              onClick={() => onToggleActive(zone.id, zone.is_active)}
              className="px-3 py-1.5 rounded-lg border border-[#E6E2F0] hover:bg-slate-50 text-[#77738A] hover:text-[#17152B] font-jakarta text-[12px] font-semibold transition-colors"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleActive(zone.id, zone.is_active)}
              className="px-3.5 py-1.5 rounded-lg bg-[#7C5CFC] hover:bg-[#5B3FE8] text-white font-jakarta text-[12px] font-semibold transition-colors shadow-xs"
            >
              Activate
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(zone)}
            className="px-3 py-1.5 rounded-lg border border-[#E6E2F0] hover:bg-[#F6F1FF] text-[#17152B] font-jakarta text-[12px] font-semibold transition-colors"
          >
            Edit
          </button>

          <Link
            href={`/app/events/${eventId}/operations/volunteers`}
            className="px-3 py-1.5 rounded-lg bg-[#F6F1FF] hover:bg-[#E5DEFF] text-[#7C5CFC] font-jakarta text-[12px] font-semibold transition-colors whitespace-nowrap"
          >
            Configure Scanners
          </Link>

          <button
            type="button"
            onClick={() => onDelete(zone)}
            className="w-8 h-8 rounded-lg border border-[#E6E2F0] hover:bg-rose-50 text-[#77738A] hover:text-rose-600 flex items-center justify-center transition-colors"
            title="Delete zone"
            aria-label={`Delete ${zone.name}`}
          >
            <span className="material-symbols-outlined text-[17px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
