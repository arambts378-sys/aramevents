import React from 'react';
import Link from 'next/link';
import { ButtonLink, Check, Container, Section, SectionIntro } from './primitives';
import { EventPass } from './EventPass';
import { FeatureRendition } from './Renditions';
import { FAQS, FEATURES, SECURITY_FACTS, USE_CASES, WORKFLOW } from './content';

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-mk-paper">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-[-10rem] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(109,80,245,0.16),rgba(109,80,245,0)_65%)]"
      />
      <Container className="relative grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pb-28 2xl:min-h-[calc(100vh-68px)] 2xl:py-20">
        <div>
          <h1 className="font-display text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.035em] text-mk-ink text-balance sm:text-[4rem] lg:text-[4.75rem] 2xl:text-[6rem]">
            From first registration to last check-in.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.125rem] leading-[1.65] text-mk-body text-pretty 2xl:max-w-[40rem] 2xl:text-[1.3125rem]">
            Aram Events gives your team one workspace for the event website, registration and tickets, QR check-in at
            the door, and every attendee’s record afterwards.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/organizer/register">Create free account</ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Log in
            </ButtonLink>
          </div>
          <p className="mt-4 text-[0.875rem] text-mk-muted">The Free plan includes two active events and three team members.</p>
        </div>
        <EventPass />
      </Container>
    </section>
  );
}

export function WorkflowSteps({ detailed = false }: { detailed?: boolean }) {
  return (
    <ol className={`grid gap-px overflow-hidden rounded-[20px] border border-mk-line bg-mk-line ${detailed ? '' : 'md:grid-cols-5'}`}>
      {WORKFLOW.map((step, i) => (
        <li key={step.title} className={`bg-white p-6 ${detailed ? 'grid gap-4 sm:grid-cols-[4rem_1fr] sm:p-8' : ''}`}>
          <span className="font-display text-[1.75rem] font-semibold leading-none text-mk-violet tabular-nums">{i + 1}</span>
          <div className={detailed ? '' : 'mt-5'}>
            <h3 className={`font-display font-semibold tracking-[-0.01em] text-mk-ink ${detailed ? 'text-[1.375rem]' : 'text-[1.125rem]'}`}>
              {step.title}
            </h3>
            <p className="mt-2 text-[0.9375rem] leading-[1.6] text-mk-body">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FeatureShowcase({ keys }: { keys?: (typeof FEATURES)[number]['key'][] }) {
  const list = keys ? FEATURES.filter((f) => keys.includes(f.key)) : FEATURES;
  return (
    <div className="space-y-20 lg:space-y-28">
      {list.map((f, i) => (
        <article key={f.key} id={f.key} className="grid scroll-mt-28 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className={i % 2 ? 'lg:order-2' : ''}>
            <h3 className="font-display text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-mk-ink sm:text-[2rem]">
              {f.title}
            </h3>
            <p className="mt-3 max-w-[30rem] text-[1.0625rem] leading-[1.6] text-mk-body">{f.summary}</p>
            <ul className="mt-6 space-y-3">
              {f.points.map((p) => (
                <li key={p} className="flex gap-3 text-[0.9375rem] leading-[1.55] text-mk-ink">
                  <Check className="mt-[3px] text-mk-violet" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={i % 2 ? 'lg:order-1' : ''}>
            <FeatureRendition feature={f.key} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function FeatureIndex() {
  return (
    <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f) => (
        <li key={f.key} className="border-t-2 border-mk-ink pt-5">
          <Link href={`/features#${f.key}`} className="mk-focus group block">
            <h3 className="font-display text-[1.25rem] font-semibold tracking-[-0.01em] text-mk-ink group-hover:text-mk-violet-strong">
              {f.title}
            </h3>
            <p className="mt-2 text-[0.9375rem] leading-[1.6] text-mk-body">{f.summary}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function UseCaseGrid({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {USE_CASES.map((u) => (
        <article
          key={u.slug}
          id={u.slug}
          className="scroll-mt-28 rounded-[20px] border border-mk-line bg-white p-7 sm:p-8"
        >
          <h3 className="font-display text-[1.375rem] font-semibold tracking-[-0.015em] text-mk-ink">{u.title}</h3>
          <p className="mt-3 text-[0.9375rem] leading-[1.6] text-mk-body">{u.body}</p>
          {detailed && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {u.uses.map((x) => (
                <li key={x} className="rounded-lg bg-mk-lilac px-3 py-1.5 text-[0.8125rem] font-medium text-mk-indigo">
                  {x}
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}

export function SecurityFacts({ onDark = false }: { onDark?: boolean }) {
  return (
    <dl className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
      {SECURITY_FACTS.map((s) => (
        <div key={s.title}>
          <dt className={`font-display text-[1.125rem] font-semibold ${onDark ? 'text-white' : 'text-mk-ink'}`}>{s.title}</dt>
          <dd className={`mt-2 text-[0.9375rem] leading-[1.6] ${onDark ? 'text-[#CFC8F5]' : 'text-mk-body'}`}>{s.body}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SecurityBand() {
  return (
    <Section tone="indigo">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionIntro
          onDark
          title="Attendee data stays inside your workspace."
          lead="Access is enforced by the database itself, so a team member only ever sees what their role allows."
        />
        <ButtonLink href="/security" variant="ghostDark" className="self-start lg:self-auto">
          How we protect your data
        </ButtonLink>
      </div>
      <div className="mt-14">
        <SecurityFacts onDark />
      </div>
    </Section>
  );
}

export function FaqList() {
  return (
    <div className="divide-y divide-mk-line border-y border-mk-line">
      {FAQS.map((f) => (
        <details key={f.q} className="group py-5">
          <summary className="mk-focus flex cursor-pointer list-none items-center justify-between gap-6 text-left font-display text-[1.125rem] font-semibold text-mk-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-mk-line text-mk-violet transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 max-w-[42rem] text-[0.9375rem] leading-[1.65] text-mk-body">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({
  title = 'Set up your next event this afternoon.',
  lead = 'Create a free account, add your event, and share the registration link today.',
}: {
  title?: string;
  lead?: string;
}) {
  return (
    <section className="bg-mk-paper pb-20 sm:pb-24">
      <Container>
        <div className="relative overflow-hidden rounded-[28px] bg-mk-violet px-7 py-14 text-white sm:px-14 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full border-[48px] border-white/10"
          />
          <h2 className="relative max-w-[36rem] font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-balance sm:text-[2.75rem]">
            {title}
          </h2>
          <p className="relative mt-4 max-w-[32rem] text-[1.0625rem] leading-[1.6] text-[#E4DEFF]">{lead}</p>
          <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/organizer/register" variant="onDark">
              Create free account
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghostDark">
              Talk to us
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function PageHero({ title, lead, children }: { title: string; lead: string; children?: React.ReactNode }) {
  return (
    <section className="bg-mk-paper pb-14 pt-16 sm:pb-20 sm:pt-24">
      <Container>
        <SectionIntro as="h1" title={title} lead={lead} />
        {children}
      </Container>
    </section>
  );
}

export { Section, SectionIntro, Container, ButtonLink };
