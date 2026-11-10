import * as React from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ElementType;
}

export function Input({ label, error, hint, icon: Icon, className, id, ...props }: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="flex items-center justify-between text-[10.5px] font-medium uppercase tracking-[0.16em] text-smoke"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ash"
            strokeWidth={1.8}
          />
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`input ${Icon ? 'pl-10' : ''} ${className ?? ''} ${
            error ? 'border-critical/60 focus:border-critical/60 focus:ring-critical/10' : ''
          }`}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="flex items-center gap-1.5 text-xs text-critical">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-ash">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
