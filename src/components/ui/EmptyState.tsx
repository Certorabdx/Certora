import * as React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden text-center ${
        compact ? 'py-10' : 'py-16'
      }`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-48 w-48 rounded-full border border-line/50" />
        <div className="absolute h-32 w-32 rounded-full border border-line/70" />
        <div className="absolute h-20 w-20 rounded-full border border-gold/10 bg-gold/[0.03]" />
      </div>
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-line-strong bg-raised text-smoke shadow-card">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="relative text-[15px] font-medium tracking-[-0.01em] text-chalk">{title}</h3>
      <p className="relative mt-2 max-w-sm text-[13px] leading-relaxed text-smoke">{description}</p>
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}
