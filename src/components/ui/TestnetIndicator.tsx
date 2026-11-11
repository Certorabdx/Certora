import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface TestnetIndicatorProps {
  network: string | null;
  connected: boolean;
  className?: string;
}

export function TestnetIndicator({ network, connected, className }: TestnetIndicatorProps) {
  const isTestnet = network === 'testnet';
  // A connected wallet whose network is missing or unrecognized is just as
  // unsupported as Mainnet. Never render it as a Testnet badge.
  const rejected = connected && !isTestnet;
  const rejectionLabel =
    network === 'mainnet'
      ? 'Mainnet — rejected'
      : network
        ? `Unsupported: ${network}`
        : 'Network unverified';

  if (rejected) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border border-critical/30 bg-critical/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-critical ${className ?? ''}`}
        title={`Connected network: ${network ?? 'unknown'}`}
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>{rejectionLabel}</span>
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
