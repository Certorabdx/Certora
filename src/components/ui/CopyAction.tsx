import * as React from 'react';
import { Check, Copy, X } from 'lucide-react';
import { Button } from './Button';

interface CopyActionProps {
  value: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function CopyAction({ value, label = 'Copy', size = 'sm', className }: CopyActionProps) {
  const [state, setState] = React.useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 1800);
  };

  return (
    <Button variant="secondary" size={size} onClick={copy} className={className}>
      {state === 'failed' ? (
        <X className="h-3.5 w-3.5 text-critical" />
      ) : state === 'copied' ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {state === 'failed' ? 'Copy failed' : state === 'copied' ? 'Copied' : label}
    </Button>
  );
}
