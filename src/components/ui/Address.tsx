import * as React from 'react';
import { CopyButton } from './CopyButton';
import { shortAddress } from '../../lib/format';

interface AddressProps {
  address: string;
  shortened?: boolean;
  showCopy?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'text-xs',
  md: 'text-[13px]',
  lg: 'text-sm',
};

export function Address({
  address,
  shortened = false,
  showCopy = true,
  size = 'md',
  className,
}: AddressProps) {
  const display = shortened ? shortAddress(address) : address;

  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${className ?? ''}`}>
      <span
        className={`address ${sizes[size]} ${shortened ? 'address-short' : ''}`}
        title={address}
      >
        {display}
      </span>
      {showCopy && <CopyButton address={address} />}
    </div>
  );
}
