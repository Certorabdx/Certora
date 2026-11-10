import * as React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  variant?: 'default' | 'inset';
}

export function Card({ padded = true, variant = 'default', className, children, ...props }: CardProps) {
  return (
    <div
      className={`${variant === 'inset' ? 'card-inset' : 'card'} ${padded ? 'p-5 md:p-6' : 'p-0'} ${className ?? ''}`}
      {...props}
    >
      {children}
    </div>
  );
}

Card.displayName = 'Card';
