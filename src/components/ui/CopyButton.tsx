import * as React from 'react';
import { Check, Copy, X } from 'lucide-react';

interface CopyButtonProps {
  address: string;
  size?: 'sm' | 'md';
  label?: string;
}

export function CopyButton({ address, size = 'sm', label }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setFailed(false);
    } catch {
      setCopied(false);
      setFailed(true);
    }
    setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 1600);
  };

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={copy}
      title={failed ? 'Copy failed' : copied ? 'Copied' : 'Copy address'}
      aria-label={failed ? 'Copy failed' : 'Copy address to clipboard'}
      className={`btn-copy ${size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'}`}
    >
      {failed ? (
        <X className={`${iconSize} text-critical`} />
      ) : copied ? (
        <Check className={`${iconSize} text-success`} />
      ) : (
        <Copy className={iconSize} />
      )}
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}
