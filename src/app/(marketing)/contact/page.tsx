import React from 'react';
import type { Metadata } from 'next';
import { GENERAL_EMAIL, SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contact Aram Events at ${SUPPORT_EMAIL} for support or ${GENERAL_EMAIL} for general enquiries.`,
};

const CHANNELS = [
  { label: 'Support', email: SUPPORT_EMAIL, detail: 'Help with your account, events or the platform.' },
  { label: 'General enquiries', email: GENERAL_EMAIL, detail: 'Plans, partnerships and anything else.' },
];

export default function ContactPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col justify-center px-5 py-20 text-center sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-ds-accent-strong">Contact</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-ds-ink sm:text-5xl">Get in touch with us.</h1>
      <p className="mx-auto mt-5 max-w-xl leading-7 text-ds-muted">
        Email us and the Aram team will get back to you.
      </p>
      <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
        {CHANNELS.map((channel) => (
          <div key={channel.email} className="min-w-0 rounded-lg border border-ds-line bg-white p-6">
            <h2 className="text-sm font-semibold text-ds-ink">{channel.label}</h2>
            <p className="mt-1 text-sm leading-6 text-ds-muted">{channel.detail}</p>
            <a
              href={`mailto:${channel.email}`}
              className="mt-3 inline-block break-all font-semibold text-ds-accent-strong underline-offset-2 hover:underline"
            >
              {channel.email}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
