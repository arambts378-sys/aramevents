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
        <table className="ds-table min-w-[760px]">
          <thead>
            <tr>
              <th scope="col">Workspace / Organization</th>
              <th scope="col">Owner</th>
              <th scope="col">Plan</th>
              <th scope="col" className="text-center">Events</th>
              <th scope="col" className="text-center">Registrations</th>
              <th scope="col">Status</th>
              <th scope="col">Created</th>
              <th scope="col" className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((org) => (
              <tr key={org.id} className="hover:bg-ds-subtle transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex flex-col">
                    <Link
                      href={`/super-admin/customers/${org.id}`}
                      className="font-bold text-sm text-ds-ink hover:text-ds-accent hover:underline"
                    >
                      {org.name}
                    </Link>
                    <span className="text-[11px] text-ds-muted font-mono mt-0.5">
                      {org.slug}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-ds-muted font-medium">
                    {org.ownerName || '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      org.planId === 'enterprise'
                        ? 'bg-ds-accent-soft text-ds-accent'
                        : org.planId === 'professional'
                        ? 'bg-[#E0F2FE] text-[#0284C7]'
                        : 'bg-[#F3F4F6] text-ds-body'
                    }`}
                  >
                    {org.planId}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center font-semibold text-ds-ink tabular-nums">
                  {org.eventCount.toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-center font-semibold text-ds-ink tabular-nums">
                  {org.registrationCount.toLocaleString()}
                </td>
                <td className="px-4 py-3.5">
                  {org.isSuspended ? (
                    <span
                      title={org.suspendedReason || 'Workspace suspended'}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFDAD6] text-ds-danger"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-ds-danger" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-ds-muted whitespace-nowrap">
                  {formatDate(org.createdAt)}
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/super-admin/customers/${org.id}`}
                      className="px-2.5 py-1.5 rounded-lg border border-ds-line text-xs font-semibold text-ds-muted hover:bg-ds-subtle hover:text-ds-accent transition-colors"
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
                          : 'bg-[#FFDAD6] text-ds-danger hover:bg-[#FFB4AB]'
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
