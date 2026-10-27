import Image from 'next/image';

const SIZES = {
  sm: 'h-6',
  md: 'h-7',
  lg: 'h-9',
};

interface AramLogoProps {
  size?: keyof typeof SIZES;
  priority?: boolean;
  className?: string;
}

/** Brand logo: the multicolor Aram wordmark. */
export function AramLogo({ size = 'md', priority, className = '' }: AramLogoProps) {
  return (
    <Image
      src="/aram-logo.png"
      alt="Aram"
      width={1382}
      height={418}
      priority={priority}
      className={`${SIZES[size]} w-auto ${className}`}
    />
  );
}
