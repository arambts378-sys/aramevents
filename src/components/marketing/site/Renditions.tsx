import React from 'react';
import type { FeatureKey } from './content';

/**
 * Drawn versions of real Aram Events screens, using the product's own design
 * tokens (ds-*). Sample data is illustrative. Swap any of these for a captured
 * screenshot by passing `image` to ProductFrame.
 */

export function ProductFrame({
  path,
  image,
  children,
}: {
  path: string;
  image?: { src: string; alt: string };
  children?: React.ReactNode;
}) {
  return (
    <figure className="overflow-hidden rounded-[20px] border border-mk-line bg-white shadow-[0_24px_60px_-34px_rgba(36,27,94,0.55)]">
      <div className="flex items-center gap-3 border-b border-ds-line bg-ds-subtle px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E3DFF2]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E3DFF2]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E3DFF2]" />
        </span>
        <span className="truncate rounded-md bg-white px-2.5 py-1 text-[0.6875rem] text-ds-muted">aram.events{path}</span>
      </div>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.src} alt={image.alt} className="block w-full" />
      ) : (
        <div className="bg-ds-canvas p-4 font-sans text-ds-ink sm:p-5">{children}</div>
      )}
    </figure>
  );
}

function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'accent' | 'muted'; children: React.ReactNode }) {
  const tones = {
    ok: 'bg-ds-success-soft text-ds-success',
    warn: 'bg-ds-warning-soft text-ds-warning',
    accent: 'bg-ds-accent-soft text-ds-accent-strong',
    muted: 'bg-ds-subtle text-ds-muted',
  };
  return <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium ${tones[tone]}`}>{children}</span>;
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-ds-line bg-white ${className}`}>{children}</div>;
}

function WebsiteView() {
  const sections = [
    ['Hero', true],
    ['Event info', true],
    ['About', true],
    ['Speakers', true],
    ['Agenda', false],
    ['Register', true],
    ['Sponsors', false],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
      <Card className="hidden p-3 sm:block">
        <p className="mb-2 text-[0.6875rem] font-semibold text-ds-muted">Sections</p>
        <ul className="space-y-1.5 text-[0.75rem]">
          {sections.map(([name, on]) => (
            <li key={name} className="flex items-center justify-between">
              <span className={on ? 'text-ds-ink' : 'text-ds-muted'}>{name}</span>
              <span className={`h-3.5 w-6 rounded-full p-0.5 ${on ? 'bg-ds-accent' : 'bg-ds-line-strong'}`}>
                <span className={`block h-2.5 w-2.5 rounded-full bg-white ${on ? 'translate-x-2.5' : ''}`} />
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-[#3A2F86] to-[#6D50F5] px-5 py-6 text-white">
          <p className="text-[0.6875rem] opacity-80">12 to 13 Dec 2026, HICC Hyderabad</p>
          <p className="mt-1 text-[1.125rem] font-semibold">Hyderabad Design Week</p>
          <span className="mt-3 inline-flex rounded-md bg-white px-2.5 py-1 text-[0.6875rem] font-semibold text-ds-accent-strong">Register now</span>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3">
          {['Riya Menon', 'Arjun Das', 'Meera Iyer'].map((n) => (
            <div key={n} className="rounded-lg bg-ds-subtle p-2 text-center">
              <span className="mx-auto block h-7 w-7 rounded-full bg-ds-line-strong" />
              <p className="mt-1.5 truncate text-[0.625rem] font-medium">{n}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-ds-line px-3 py-2">
          <Pill tone="warn">Draft</Pill>
          <span className="rounded-md bg-ds-accent px-2.5 py-1 text-[0.6875rem] font-semibold text-white">Publish</span>
        </div>
      </Card>
    </div>
  );
}

function RegistrationView() {
  const tickets = [
    ['General pass', 'Free', 312, 400],
    ['Workshop add-on', '₹1,200', 58, 80],
    ['Student', 'Free', 140, 150],
  ] as const;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Registered', '510'],
          ['Capacity', '630'],
          ['Seats left', '120'],
        ].map(([l, v]) => (
          <Card key={l} className="p-3">
            <p className="text-[0.6875rem] text-ds-muted">{l}</p>
            <p className="mt-0.5 text-[1.125rem] font-semibold tabular-nums">{v}</p>
          </Card>
        ))}
      </div>
      <Card>
        <div className="border-b border-ds-line px-3 py-2 text-[0.75rem] font-semibold">Ticket types</div>
        <ul className="divide-y divide-ds-line">
          {tickets.map(([name, price, sold, total]) => (
            <li key={name} className="flex items-center gap-3 px-3 py-2.5 text-[0.75rem]">
              <span className="flex-1 font-medium">{name}</span>
              <span className="w-14 text-ds-muted">{price}</span>
              <span className="hidden w-24 sm:block">
                <span className="block h-1.5 overflow-hidden rounded-full bg-ds-subtle">
                  <span className="block h-full rounded-full bg-ds-accent" style={{ width: `${(sold / total) * 100}%` }} />
                </span>
              </span>
              <span className="w-14 text-right tabular-nums text-ds-muted">
                {sold}/{total}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ScannerView() {
  return (
    <div className="mx-auto max-w-[260px]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ds-line px-3 py-2 text-[0.6875rem]">
          <span className="font-semibold">Main hall, Gate B</span>
          <span className="text-ds-muted">Scanner link</span>
        </div>
        <div className="relative m-3 grid aspect-square place-items-center rounded-lg bg-[#1C1633]">
          <span className="absolute inset-6 rounded-lg border-2 border-white/70" />
          <span className="text-[0.6875rem] text-white/70">Point the camera at a ticket</span>
        </div>
        <div className="mx-3 mb-3 rounded-lg bg-ds-success-soft px-3 py-2.5">
          <p className="text-[0.8125rem] font-semibold text-ds-success">Checked in</p>
          <p className="text-[0.6875rem] text-ds-success">Ananya Rao, General pass</p>
        </div>
        <div className="mx-3 mb-3 rounded-lg bg-ds-danger-soft px-3 py-2.5">
          <p className="text-[0.8125rem] font-semibold text-ds-danger">Already checked in</p>
          <p className="text-[0.6875rem] text-ds-danger">This ticket was used at this zone.</p>
        </div>
      </Card>
    </div>
  );
}

function PeopleView() {
  const people = [
    ['Ananya Rao', 'ananya@example.com', 3, 'Checked in'],
    ['Karthik Reddy', 'karthik@example.com', 1, 'Registered'],
    ['Fatima Sheikh', 'fatima@example.com', 2, 'Checked in'],
    ['Rahul Verma', 'rahul@example.com', 1, 'Registered'],
  ] as const;
  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-ds-line px-3 py-2">
        <span className="flex-1 rounded-md border border-ds-line-strong px-2 py-1 text-[0.6875rem] text-ds-muted">Search people</span>
        <span className="rounded-md border border-ds-line-strong px-2 py-1 text-[0.6875rem] font-medium">Import CSV</span>
      </div>
      <ul className="divide-y divide-ds-line">
        {people.map(([name, email, events, status]) => (
          <li key={name} className="flex items-center gap-3 px-3 py-2.5 text-[0.75rem]">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ds-accent-soft text-[0.625rem] font-semibold text-ds-accent-strong">
              {name.split(' ').map((p) => p[0]).join('')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{name}</span>
              <span className="block truncate text-ds-muted">{email}</span>
            </span>
            <span className="hidden text-ds-muted sm:block">{events} events</span>
            <Pill tone={status === 'Checked in' ? 'ok' : 'muted'}>{status}</Pill>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TeamView() {
  const members = [
    ['Priya Nair', 'Owner'],
    ['Vikram Shah', 'Admin'],
    ['Sneha Kapoor', 'Editor'],
    ['dev@studio.in', 'Invited'],
  ] as const;
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-ds-line px-3 py-2">
        <span className="text-[0.75rem] font-semibold">Team</span>
        <span className="rounded-md bg-ds-accent px-2.5 py-1 text-[0.6875rem] font-semibold text-white">Invite member</span>
      </div>
      <ul className="divide-y divide-ds-line">
        {members.map(([name, role]) => (
          <li key={name} className="flex items-center justify-between px-3 py-2.5 text-[0.75rem]">
            <span className="font-medium">{name}</span>
            {role === 'Invited' ? <Pill tone="warn">Invite sent</Pill> : <Pill tone={role === 'Owner' ? 'accent' : 'muted'}>{role}</Pill>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AnalyticsView() {
  const days = [18, 26, 22, 34, 41, 38, 52, 47, 60, 72, 66, 84];
  const max = Math.max(...days);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Registrations', '510'],
          ['Checked in', '438'],
          ['Attendance', '86%'],
        ].map(([l, v]) => (
          <Card key={l} className="p-3">
            <p className="text-[0.6875rem] text-ds-muted">{l}</p>
            <p className="mt-0.5 text-[1.125rem] font-semibold tabular-nums">{v}</p>
          </Card>
        ))}
      </div>
      <Card className="p-3">
        <p className="text-[0.75rem] font-semibold">Registrations by day</p>
        <div className="mt-3 flex h-24 items-end gap-1.5" aria-hidden="true">
          {days.map((d, i) => (
            <span key={i} className="flex-1 rounded-t-[3px] bg-ds-accent" style={{ height: `${(d / max) * 100}%`, opacity: 0.45 + (i / days.length) * 0.55 }} />
          ))}
        </div>
      </Card>
    </div>
  );
}

const VIEWS: Record<FeatureKey, { path: string; View: () => React.ReactElement }> = {
  website: { path: '/app/events/website/editor', View: WebsiteView },
  registration: { path: '/app/events/tickets', View: RegistrationView },
  checkin: { path: '/check-in', View: ScannerView },
  people: { path: '/app/people', View: PeopleView },
  team: { path: '/app/settings#team', View: TeamView },
  analytics: { path: '/app/events/analytics', View: AnalyticsView },
};

export function FeatureRendition({ feature }: { feature: FeatureKey }) {
  const { path, View } = VIEWS[feature];
  return (
    <ProductFrame path={path}>
      <View />
    </ProductFrame>
  );
}
