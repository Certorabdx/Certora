import * as React from 'react';

/**
 * Certora brand mark — a wax-seal silhouette with a destination-pin cutout.
 * The seal signals explicit approval; the pin is the recipient destination it
 * protects. The pin is masked out so the mark works on any surface.
 */
const SEAL_PATH =
  'M12.57 3.2Q16 1 19.43 3.2Q23.5 3.01 25.37 6.63Q28.99 8.5 28.8 12.57Q31 16 28.8 19.43Q28.99 23.5 25.37 25.37Q23.5 28.99 19.43 28.8Q16 31 12.57 28.8Q8.5 28.99 6.63 25.37Q3.01 23.5 3.2 19.43Q1 16 3.2 12.57Q3.01 8.5 6.63 6.63Q8.5 3.01 12.57 3.2Z';

const PIN_PATH =
  'M16 9.3c-2.76 0-5 2.24-5 5 0 3.7 5 8.3 5 8.3s5-4.6 5-8.3c0-2.76-2.24-5-5-5Z';

interface LogoMarkProps {
  className?: string;
  /** Gold seal (default) or a single-colour version for watermarks. */
  tone?: 'gold' | 'mono';
}

export function LogoMark({ className, tone = 'gold' }: LogoMarkProps) {
  const reactId = React.useId().replace(/:/g, '');
  const gradientId = `certora-seal-${reactId}`;
  const maskId = `certora-pin-${reactId}`;

  const mono = tone === 'mono';

  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {!mono && (
          <linearGradient
            id={gradientId}
            x1="8"
            y1="4"
            x2="24"
            y2="29"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#F6D9A6" />
            <stop offset="0.44" stopColor="#E7B36A" />
            <stop offset="1" stopColor="#AE7C35" />
          </linearGradient>
        )}

        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="32"
          height="32"
        >
          <path d={SEAL_PATH} fill="#fff" />
          <path d={PIN_PATH} fill="#000" />
          <circle cx="16" cy="14.3" r="1.55" fill="#fff" />
        </mask>
      </defs>

      <g mask={`url(#${maskId})`}>
        <path d={SEAL_PATH} fill={mono ? 'currentColor' : `url(#${gradientId})`} />
        <circle
          cx="16"
          cy="16"
          r="10.35"
          fill="none"
          stroke={mono ? 'currentColor' : '#1A1509'}
          strokeOpacity={mono ? 0.4 : 0.28}
          strokeWidth="0.75"
        />
        <path
          d={SEAL_PATH}
          fill="none"
          stroke={mono ? 'currentColor' : '#6B4A20'}
          strokeOpacity={mono ? 0.4 : 0.55}
          strokeWidth="0.55"
        />
      </g>
    </svg>
  );
}
