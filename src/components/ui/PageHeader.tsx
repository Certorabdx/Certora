import * as React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex animate-fade-up flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="eyebrow mb-3 flex items-center gap-2.5">
            <span className="h-px w-6 bg-gold/60" />
            {eyebrow}
          </p>
        )}
        <h1 className="display text-[2.55rem] leading-[1.02] text-chalk md:text-[3.15rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-smoke">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
