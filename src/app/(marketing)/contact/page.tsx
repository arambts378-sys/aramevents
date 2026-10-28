import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactForm } from '@/components/marketing/site/ContactForm';
import { Container } from '@/components/marketing/site/primitives';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Ask about plans, getting started or support for Aram Events.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  return (
    <section className="bg-mk-paper pb-24 pt-16 sm:pt-24">
      <Container className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <h1 className="font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-mk-ink text-balance sm:text-[3.25rem]">
            Talk to the people who build it.
          </h1>
          <p className="mt-5 max-w-[30rem] text-[1.0625rem] leading-[1.65] text-mk-body">
            Questions about plans, a large event, or moving over from spreadsheets: send a message and we will reply by email.
          </p>
          <dl className="mt-10 grid gap-6 border-t border-mk-line pt-8">
            <div>
              <dt className="font-display text-[1.0625rem] font-semibold text-mk-ink">Already have an account?</dt>
              <dd className="mt-1 text-[0.9375rem] text-mk-body">
                <Link href="/login" className="mk-focus font-semibold text-mk-violet-strong hover:underline">
                  Log in
                </Link>{' '}
                to reach your workspace.
              </dd>
            </div>
            <div>
              <dt className="font-display text-[1.0625rem] font-semibold text-mk-ink">Want to try it first?</dt>
              <dd className="mt-1 text-[0.9375rem] text-mk-body">
                The{' '}
                <Link href="/organizer/register" className="mk-focus font-semibold text-mk-violet-strong hover:underline">
                  Free plan
                </Link>{' '}
                takes a few minutes to set up.
              </dd>
            </div>
          </dl>
        </div>
        <ContactForm initialTopic={topic} />
      </Container>
    </section>
  );
}
