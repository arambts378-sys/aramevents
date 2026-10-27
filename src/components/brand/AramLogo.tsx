import Image from 'next/image';
import { Instrument_Serif } from 'next/font/google';

// Display face for the "events" half of the wordmark
const wordmarkFont = Instrument_Serif({ weight: '400', style: 'italic', subsets: ['latin'] });

const SIZES = {
  sm: { logo: 'h-6', text: 'text-[26px]' },
  md: { logo: 'h-7', text: 'text-[30px]' },
  lg: { logo: 'h-9', text: 'text-[38px]' },
};

interface AramLogoProps {
  size?: keyof typeof SIZES;
  /** Use "light" on dark backgrounds so the wordmark stays readable */
  tone?: 'dark' | 'light';
  priority?: boolean;
  className?: string;
}

/** Brand lockup: the Aram logo followed by an italic serif "events". */
export function AramLogo({ size = 'md', tone = 'dark', priority, className = '' }: AramLogoProps) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-end gap-2 ${className}`}>
      <Image
        src="/aram-logo.png"
        alt="Aram"
        width={1382}
        height={418}
        priority={priority}
        className={`${s.logo} w-auto`}
      />
      <span
        className={`${wordmarkFont.className} ${s.text} italic leading-[0.8] ${tone === 'light' ? 'text-white' : 'text-ds-ink'}`}
      >
        events
      </span>
    </span>
  );
}
