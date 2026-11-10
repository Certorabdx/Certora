import { Menu, ShieldCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { WalletStatus } from '../ui/WalletStatus';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

interface HeaderProps {
  connected: boolean;
  address: string | null;
  network: string | null;
  providerAvailable: boolean;
  connecting: boolean;
  onConnect: () => void;
  onMenu: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  '/': 'Overview',
  '/resolve': 'Resolve BNS',
  '/recipients': 'Protected recipients',
  '/activity': 'Activity',
  '/settings': 'Settings',
};

function useSectionLabel() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/recipients/')) return 'Recipient details';
  return SECTION_LABELS[pathname] ?? 'Overview';
}

export function Header({
  connected,
  address,
  network,
  providerAvailable,
  connecting,
  onConnect,
  onMenu,
}: HeaderProps) {
  const section = useSectionLabel();

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenu}
            className="rounded-lg border border-line p-2 text-smoke transition-colors hover:border-line-strong hover:bg-white/[0.04] hover:text-chalk md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="md:hidden">
            <Logo compact />
          </div>

          <div className="hidden min-w-0 items-center gap-2.5 md:flex">
            <ShieldCheck className="h-4 w-4 shrink-0 text-gold/70" strokeWidth={1.7} />
            <span className="text-[12px] font-medium text-smoke">Recipient protection</span>
            <span className="text-line-strong">/</span>
            <span className="truncate text-[12px] text-ash">{section}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <WalletStatus connected={connected} address={address} network={network} />
          {!connected && providerAvailable && (
            <Button size="sm" onClick={onConnect} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect wallet'}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
