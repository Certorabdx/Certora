import * as React from 'react';

interface IdenticonProps {
  value: string;
  size?: number;
  className?: string;
}

const GRADIENTS: Array<[string, string]> = [
  ['#EBC487', '#8A5A2B'],
  ['#96D8B4', '#2F6B4F'],
  ['#A9BCEA', '#3B4E8C'],
  ['#EDA3A0', '#7A3A3A'],
  ['#D0B7EC', '#5B3F82'],
  ['#E8D08F', '#776027'],
  ['#93CDD8', '#2C5A66'],
];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function Identicon({ value, size = 28, className }: IdenticonProps) {
  const [from, to] = GRADIENTS[hash(value) % GRADIENTS.length];
  const initials = value.replace(/^0x/i, '').slice(0, 2).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15 ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      <span className="absolute inset-0 bg-noise opacity-50" />
      <span
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.5), transparent 48%)',
        }}
      />
      <span
        className="relative font-mono font-semibold text-[#11100b]"
        style={{ fontSize: Math.max(9, size * 0.34), letterSpacing: '-0.03em' }}
      >
        {initials}
      </span>
    </span>
  );
}
