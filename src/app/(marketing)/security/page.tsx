import type { Metadata } from 'next';
import { CtaBand, PageHero, Section, SectionIntro, SecurityFacts } from '@/components/marketing/site/sections';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'How Aram Events protects organizer accounts and attendee data: verified sign-up, workspace isolation, role-based permissions and signed QR tickets.',
  alternates: { canonical: '/security' },
};

const ROLES = [
  ['Owner', 'Everything, including the plan and the team. Each workspace has one owner.'],
  ['Admin', 'Create, edit, publish and delete events, and manage team members.'],
  ['Editor', 'Create, edit and publish events, and manage people.'],
  ['Member', 'Create and edit events, and view people.'],
  ['Viewer', 'Look at events and people without changing anything.'],
] as const;

export default function SecurityPage() {
  return (
    <>
      <PageHero
        title="How we look after your events and the people who attend them."
        lead="This page describes what the product does today. We would rather list fewer things than claim ones we cannot show you."
      />
      <Section tone="white">
        <SecurityFacts />
      </Section>
      <Section>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionIntro
            title="Who can do what."
            lead="Each invited team member gets one role. The database checks it on every change, so hiding a button is never the only protection."
          />
          <dl className="divide-y divide-mk-line border-y border-mk-line">
            {ROLES.map(([role, can]) => (
              <div key={role} className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="font-display text-[1.0625rem] font-semibold text-mk-ink">{role}</dt>
                <dd className="text-[0.9375rem] leading-[1.6] text-mk-body">{can}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>
      <Section tone="white">
        <SectionIntro
          title="Report a security concern."
          lead="If you think you have found a vulnerability, send the details through the contact page with “Security” as the topic. Please do not test against other organizers’ events."
        />
      </Section>
      <CtaBand />
    </>
  );
}
