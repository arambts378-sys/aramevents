import React from 'react';
import Link from 'next/link';

export function Container({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mk-container ${className}`}>{children}</div>;
}

type Tone = 'paper' | 'white' | 'indigo';

const TONES: Record<Tone, string> = {
  paper: 'bg-mk-paper text-mk-ink',
  white: 'bg-white text-mk-ink',
  indigo: 'bg-mk-indigo text-white',
};

export function Section({
  id,
  tone = 'paper',
  className = '',
  children,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`${TONES[tone]} py-20 sm:py-24 lg:py-28 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionIntro({
  title,
  lead,
  onDark = false,
  as: Tag = 'h2',
}: {
  title: string;
  lead?: string;
  onDark?: boolean;
  as?: 'h1' | 'h2';
}) {
  return (
    <div className="max-w-[40rem] 2xl:max-w-[48rem]">
      <Tag
        className={`font-display font-semibold tracking-[-0.025em] text-balance ${
          Tag === 'h1' ? 'text-[2.5rem] leading-[1.05] sm:text-[3.5rem] 2xl:text-[4.25rem]' : 'text-[2rem] leading-[1.1] sm:text-[2.625rem] 2xl:text-[3.125rem]'
        } ${onDark ? 'text-white' : 'text-mk-ink'}`}
      >
        {title}
      </Tag>
      {lead && (
        <p className={`mt-5 text-[1.0625rem] leading-[1.65] text-pretty ${onDark ? 'text-[#CFC8F5]' : 'text-mk-body'}`}>
          {lead}
        </p>
      )}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'onDark' | 'ghostDark';

const BUTTONS: Record<ButtonVariant, string> = {
  primary: 'bg-mk-violet text-white hover:bg-mk-violet-strong shadow-[0_6px_20px_-8px_rgba(109,80,245,0.7)]',
  secondary: 'bg-white text-mk-ink border border-mk-line hover:border-mk-violet/40 hover:text-mk-violet-strong',
  onDark: 'bg-white text-mk-indigo hover:bg-mk-lilac',
  ghostDark: 'text-white border border-white/25 hover:bg-white/10',
};

export function ButtonLink({
  href,
  variant = 'primary',
  className = '',
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`mk-focus inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-[0.9375rem] font-semibold transition-colors ${BUTTONS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Check({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`h-4 w-4 shrink-0 ${className}`}>
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
