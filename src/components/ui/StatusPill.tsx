import * as React from 'react';

type Tone = 'neutral' | 'gold' | 'success' | 'warning' | 'critical';

interface StatusPillProps {
  tone?: Tone;
  children: React.ReactNode;
  icon?: React.ElementType;
  dot?: boolean;
  className?: string;
}

const tones: Record<Tone, string> = {
  neutral: 'border-line-strong bg-white/[0.035] text-smoke',
  gold: 'border-gold/25 bg-gold/[0.09] text-gold',
  success: 'border-success/25 bg-success/[0.09] text-success',
  warning: 'border-warning/25 bg-warning/[0.09] text-warning',
  critical: 'border-critical/25 bg-critical/[0.09] text-critical',
};

const dotTones: Record<Tone, string> = {
  neutral: 'bg-ash',
  gold: 'bg-gold',
  success: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-critical',
};

export function StatusPill({
  tone = 'neutral',
  children,
  icon: Icon,
  dot = false,
  className,
}: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.01em] ${tones[tone]} ${className ?? ''}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotTones[tone]}`} />}
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}
