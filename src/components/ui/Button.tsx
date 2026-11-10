import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-medium tracking-[-0.01em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-45 active:translate-y-px';

    const variants: Record<string, string> = {
      primary:
        'border-transparent bg-gold text-[#191307] shadow-gold-inset hover:bg-gold-soft',
      secondary:
        'border-line-strong bg-raised text-chalk hover:border-[#3B424E] hover:bg-[#1a2028]',
      ghost:
        'border-transparent bg-transparent text-smoke hover:bg-white/[0.055] hover:text-chalk',
      danger:
        'border-critical/25 bg-critical/[0.08] text-critical hover:border-critical/40 hover:bg-critical/[0.13]',
      dangerSolid:
        'border-transparent bg-critical text-[#1B0D0A] shadow-gold-inset hover:bg-[#EF9183]',
    };

    const sizes: Record<string, string> = {
      sm: 'h-8 px-3 text-[12.5px]',
      md: 'h-10 px-4 text-[13.5px]',
      lg: 'h-11 px-5 text-sm',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className ?? ''}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="h-3.5 w-3.5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-80"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading…
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
