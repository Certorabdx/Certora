import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface TestnetIndicatorProps {
  network: string | null;
  connected: boolean;
  className?: string;
}

export function TestnetIndicator({ network, connected, className }: TestnetIndicatorProps) {
  const isTestnet = network === 'testnet';
  const rejected = connected && !!network && !isTestnet;

  if (rejected) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border border-critical/30 bg-critical/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-critical ${className ?? ''}`}
        title={`Connected network: ${network}`}
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>Mainnet — rejected</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium ${
        connected
          ? 'border-gold/25 bg-gold/[0.07] text-gold'
          : 'border-line-strong bg-white/[0.025] text-smoke'
      } ${className ?? ''}`}
      title="Certora operates on Beldex Testnet only"
    >
      <ShieldCheck className={`h-3.5 w-3.5 ${connected ? 'text-gold' : 'text-ash'}`} />
      <span className="hidden sm:inline">Beldex Testnet</span>
      <span className="sm:hidden">Testnet</span>
    </div>
  );
}
