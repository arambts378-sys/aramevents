import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions — Draft',
  description: 'Draft Terms and Conditions for ARAM Tickets, pending legal and product review.',
  robots: { index: false, follow: false },
};

const reviewItems = [
  'Confirm the legal entity that operates the service and the applicable contact information.',
  'Define account eligibility, account responsibilities, and access permissions.',
  'Review organizer responsibilities for event pages, attendee information, and event content.',
  'Confirm the applicable pricing, payment, cancellation, refund, and chargeback terms.',
  'Define acceptable use, service availability, support, and account suspension terms.',
  'Review intellectual property, liability, dispute resolution, and governing-law provisions.',
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900">
        Draft — not final terms
      </p>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-ds-ink sm:text-4xl">
        Terms and Conditions
      </h1>
      <p className="mt-4 leading-7 text-ds-muted">
        This page is an editorial checklist for review, not a complete agreement or legal advice.
        It must be completed and approved by qualified counsel before being presented as binding
        terms.
      </p>
      <h2 className="mt-10 text-xl font-bold text-ds-ink">Topics requiring review</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-ds-muted">
        {reviewItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-8 rounded-xl border border-ds-line bg-white p-4 text-sm leading-6 text-ds-muted">
        Do not rely on this draft as the terms governing use of ARAM Tickets. Final operator
        details and product policies have not been supplied for publication.
      </p>
    </div>
  );
}
