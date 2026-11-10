import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanSearch,
  ShieldCheck,
  History,
  Settings2,
  X,
  Lock,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { StatusPill } from '../ui/StatusPill';
import { useCertora } from '../../state/CertoraProvider';

interface NavItem {
  to: string;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/resolve', label: 'Resolve BNS', icon: ScanSearch },
  { to: '/recipients', label: 'Protected Recipients', icon: ShieldCheck },
  { to: '/activity', label: 'Activity', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings2 },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { recipients } = useCertora();

  const isActive = (to: string) =>
    to === '/'
      ? location.pathname === '/'
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-line bg-[#0A0C10] transition-transform md:flex md:w-[248px] ${
          open ? 'flex translate-x-0' : 'hidden md:flex'
        }`}
        aria-label="Primary navigation"
      >
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <Logo />
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ash transition-colors hover:bg-white/[0.06] hover:text-chalk md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3">
          <div className="flex items-center gap-2 rounded-lg border border-line/70 bg-white/[0.02] px-3 py-2.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-gold/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
            </span>
            <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-smoke">
              Testnet workspace
            </span>
          </div>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto px-3">
          <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-ash">
            Workspace
          </p>
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const active = isActive(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                      active
                        ? 'bg-white/[0.055] text-chalk'
                        : 'text-smoke hover:bg-white/[0.03] hover:text-chalk'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-gold" />
                    )}
                    <Icon
                      className={`h-[17px] w-[17px] transition-colors ${
                        active ? 'text-gold' : 'text-ash group-hover:text-smoke'
                      }`}
                      strokeWidth={1.7}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.to === '/recipients' && recipients.length > 0 && (
                      <span className="rounded-md border border-line-strong bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-smoke">
                        {recipients.length}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-4 border-t border-line/70 p-4">
          <div className="rounded-xl border border-line bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ash">
                Network
              </span>
              <StatusPill tone="gold" dot>
                Testnet
              </StatusPill>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-ash">
              Beldex Testnet only. Mainnet connections are rejected.
            </p>
          </div>

          <div className="flex items-center justify-between px-0.5 text-[10.5px] text-ash">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Local-only pins
            </span>
            <span className="font-mono">v0.1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
