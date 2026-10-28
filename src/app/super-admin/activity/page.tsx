import React from 'react';
import Link from 'next/link';
import { EmptyPanel, PageHeader } from '@/components/ui';
import { FilterTabs } from '@/components/super-admin/Pager';
import { fmtAgo } from '@/components/super-admin/fmt';
import { listActivity, type ActivityItem } from '@/services/superAdminLive.server';

type SearchParams = Record<string, string | string[] | undefined>;

const KIND: Record<ActivityItem['kind'], { icon: string; className: string }> = {
  signup: { icon: 'person_add', className: 'bg-ds-accent-soft text-ds-accent-strong' },
  workspace: { icon: 'domain_add', className: 'bg-ds-accent-soft text-ds-accent-strong' },
  event: { icon: 'event', className: 'bg-ds-info-soft text-ds-info' },
  registration: { icon: 'confirmation_number', className: 'bg-ds-success-soft text-ds-success' },
  check_in: { icon: 'qr_code_scanner', className: 'bg-ds-success-soft text-ds-success' },
  check_in_denied: { icon: 'gpp_bad', className: 'bg-ds-danger-soft text-ds-danger' },
};

function dayLabel(iso: string) {
  const d = iso.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (d === today) return 'Today';
  if (d === yesterday) return 'Yesterday';
  return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const kind = typeof raw.kind === 'string' ? raw.kind : 'all';
  const result = await listActivity(kind);

  const days = new Map<string, ActivityItem[]>();
  if (result.ok) {
    for (const item of result.data) {
      const label = dayLabel(item.at);
      days.set(label, [...(days.get(label) ?? []), item]);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity"
        description="Sign-ups, new events, registrations and check-ins across every workspace in the last 30 days."
      />

      <FilterTabs
        base="/super-admin/activity"
        params={{ kind: kind === 'all' ? undefined : kind }}
        name="kind"
        active={kind}
        options={[
          { value: 'all', label: 'Everything' },
          { value: 'signup', label: 'Sign-ups' },
          { value: 'event', label: 'Events' },
          { value: 'registration', label: 'Registrations' },
          { value: 'check_in', label: 'Check-ins' },
        ]}
      />

      {!result.ok ? (
        <div className="ds-card"><EmptyPanel icon="error" title="Couldn’t load activity" description={result.message} /></div>
      ) : result.data.length === 0 ? (
        <div className="ds-card"><EmptyPanel icon="bolt" title="Nothing in the last 30 days" description="New sign-ups, events, registrations and check-ins appear here as they happen." /></div>
      ) : (
        <div className="space-y-6">
          {[...days.entries()].map(([day, items]) => (
            <section key={day} aria-label={day}>
              <h2 className="mb-2 text-[13px] font-semibold text-ds-ink">{day}</h2>
              <ol className="ds-card divide-y divide-ds-line">
                {items.map((item) => {
                  const k = KIND[item.kind];
                  const body = (
                    <>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${k.className}`}>
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{k.icon}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] text-ds-ink">{item.title}</span>
                        <span className="block truncate text-[13px] text-ds-muted">{item.detail}</span>
                      </span>
                      <time dateTime={item.at} className="shrink-0 text-[12px] text-ds-muted">{fmtAgo(item.at)}</time>
                    </>
                  );
                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link href={item.href} className="flex items-center gap-3 px-4 py-3 hover:bg-ds-subtle sm:px-5">{body}</Link>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
