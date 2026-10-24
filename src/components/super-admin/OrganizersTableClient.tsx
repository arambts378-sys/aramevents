'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { WorkspaceSuspensionModal } from './WorkspaceSuspensionModal';
import type { PlatformOrganizerItem } from '@/lib/super-admin/types';

interface OrganizersTableClientProps {
  items: PlatformOrganizerItem[];
}

export function OrganizersTableClient({ items }: OrganizersTableClientProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<{
    id: string;
    name: string;
    isSuspended: boolean;
  } | null>(null);

  const formatDate = (val: string) => {
    const d = new Date(val);
    return Number.isNaN(d.getTime())
      ? '—'
      : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(d);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8FF] text-[#77738A] font-semibold border-b border-[#E6E2F0]">
            <tr>
              <th className="px-4 py-3.5">Workspace / Organization</th>
              <th className="px-4 py-3.5">Owner</th>
              <th className="px-4 py-3.5">Plan</th>
              <th className="px-4 py-3.5 text-center">Events</th>
              <th className="px-4 py-3.5 text-center">Registrations</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Created</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EDF8]">
            {items.map((org) => (
              <tr key={org.id} className="hover:bg-[#F9F7FF] transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex flex-col">
                    <Link
                      href={`/super-admin/customers/${org.id}`}
                      className="font-bold text-sm text-[#17152B] hover:text-[#7C5CFC] hover:underline"
                    >
                      {org.name}
                    </Link>
                    <span className="text-[11px] text-[#77738A] font-mono mt-0.5">
                      {org.slug}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[#5A566B] font-medium">
                    {org.ownerName || '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      org.planId === 'enterprise'
                        ? 'bg-[#EDE9FE] text-[#7C5CFC]'
                        : org.planId === 'professional'
                        ? 'bg-[#E0F2FE] text-[#0284C7]'
                        : 'bg-[#F3F4F6] text-[#4B5563]'
                    }`}
                  >
                    {org.planId}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center font-semibold text-[#17152B] tabular-nums">
                  {org.eventCount.toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-center font-semibold text-[#17152B] tabular-nums">
                  {org.registrationCount.toLocaleString()}
                </td>
                <td className="px-4 py-3.5">
                  {org.isSuspended ? (
                    <span
                      title={org.suspendedReason || 'Workspace suspended'}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFDAD6] text-[#BA1A1A]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#BA1A1A]" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-[#77738A] whitespace-nowrap">
                  {formatDate(org.createdAt)}
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/super-admin/customers/${org.id}`}
                      className="px-2.5 py-1.5 rounded-lg border border-[#E6E2F0] text-xs font-semibold text-[#5A566B] hover:bg-[#F6F1FF] hover:text-[#7C5CFC] transition-colors"
                    >
                      360 View
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedWorkspace({
                          id: org.id,
                          name: org.name,
                          isSuspended: org.isSuspended,
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        org.isSuspended
                          ? 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]'
                          : 'bg-[#FFDAD6] text-[#BA1A1A] hover:bg-[#FFB4AB]'
                      }`}
                    >
                      {org.isSuspended ? 'Reactivate' : 'Suspend'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedWorkspace && (
        <WorkspaceSuspensionModal
          workspace={selectedWorkspace}
          isOpen={!!selectedWorkspace}
          onClose={() => setSelectedWorkspace(null)}
        />
      )}
    </>
  );
}
