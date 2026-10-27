import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Draft',
  description: 'Draft Privacy Policy for Aram Events, pending legal and product review.',
  robots: { index: false, follow: false },
};

const reviewItems = [
  'Document the personal information collected from organizers, attendees, and site visitors.',
  'Describe the purposes and lawful basis for each processing activity.',
  'Identify processors, integrations, hosting locations, and any international data transfers.',
  'Set retention periods and explain deletion, access, correction, and other applicable rights.',
  'Document cookies, analytics, communications, and any consent controls actually in use.',
  'Describe security practices accurately without promising absolute security.',
  'Provide the approved privacy contact and the process for submitting privacy requests.',
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900">
        Draft — not final policy
      </p>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-ds-ink sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-4 leading-7 text-ds-muted">
        This page is a review checklist, not a complete privacy notice. The actual data flows and
        applicable legal requirements must be confirmed before publishing a final policy.
      </p>
      <h2 className="mt-10 text-xl font-bold text-ds-ink">Topics requiring review</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-ds-muted">
        {reviewItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-8 rounded-xl border border-ds-line bg-white p-4 text-sm leading-6 text-ds-muted">
        This draft intentionally does not assert what personal data Aram Events collects, how it
        is used, or which service providers receive it. Those details require product and legal
        review.
      </p>
    </div>
  );
}
