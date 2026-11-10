import { Wallet } from 'lucide-react';
import { Address } from './Address';
import { TestnetIndicator } from './TestnetIndicator';
import { Identicon } from './Identicon';

interface WalletStatusProps {
  connected: boolean;
  address: string | null;
  network: string | null;
}

export function WalletStatus({ connected, address, network }: WalletStatusProps) {
  if (!connected || !address) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full border border-line-strong bg-white/[0.025] px-2.5 py-1.5 text-[11px] font-medium text-smoke sm:inline-flex">
          <Wallet className="h-3.5 w-3.5 text-ash" />
          Not connected
        </span>
        <TestnetIndicator network={network} connected={connected} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.025] py-1 pl-1 pr-2.5 sm:pr-1.5">
        <Identicon value={address} size={26} />
        <Address address={address} shortened showCopy size="sm" />
      </div>
      <TestnetIndicator network={network} connected={connected} />
    </div>
  );
}
