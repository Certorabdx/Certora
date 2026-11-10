import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Lock,
  RefreshCw,
  ShieldCheck,
  ScanSearch,
  Wallet,
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useCertora } from '../state/CertoraProvider';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Address } from '../components/ui/Address';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { LogoMark } from '../components/ui/LogoMark';
import { StatusPill } from '../components/ui/StatusPill';
import { Identicon } from '../components/ui/Identicon';
import { ActivityList } from './ActivityList';
import { relativeTime } from '../lib/format';

const STEPS = [
  {
    icon: ScanSearch,
    title: 'Resolve',
    description: 'Read the name through your Beldex Wallet.',
  },
  {
    icon: Lock,
    title: 'Approve',
    description: 'Pin the exact destination in this browser.',
  },
  {
    icon: RefreshCw,
    title: 'Recheck',
    description: 'Compare a fresh result against the pin.',
  },
];

export function Overview() {
  const {
    connection,
    providerAvailable,
    detecting,
    connecting,
    connect,
  } = useWallet();
  const { recipients, activity } = useCertora();
  const navigate = useNavigate();

  const connected = connection?.connected ?? false;
  const address = connection?.address ?? null;
  const network = connection?.network ?? null;
  const pinnedCount = recipients.length;

  const rechecks = activity.filter((event) => event.type === 'recipient_rechecked').length;
  const changes = activity.filter(
    (event) => event.type === 'recipient_rechecked' && event.status === 'DESTINATION_CHANGED',
  ).length;

  const handleConnect = async () => {
    try {
      await connect();
    } catch {
      // Error is surfaced through the shared wallet context.
    }
  };

  const headerActions = connected ? (
    <Button onClick={() => navigate('/resolve')}>
      Resolve a name <ArrowRight className="h-4 w-4" />
    </Button>
  ) : detecting ? (
    <StatusPill tone="neutral" dot>
      Looking for wallet
    </StatusPill>
  ) : providerAvailable ? (
    <Button onClick={handleConnect} isLoading={connecting}>
      Connect wallet
    </Button>
  ) : (
    <StatusPill tone="warning" dot>
      Wallet not detected
    </StatusPill>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Command center"
        title={
          <>
            Recipient <em className="italic text-gold">protection.</em>
          </>
        }
        description="Every BNS name you approve is pinned locally, then compared against a fresh resolution whenever you ask. Nothing is replaced without your explicit approval."
        actions={headerActions}
      />

      <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="card-paper relative overflow-hidden rounded-2xl border border-[#DCD5C6] p-7 text-[#17140D] shadow-card animate-fade-up md:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-[#C9BFA9]/80" />
            <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full border border-[#C9BFA9]/70" />
            <div className="absolute right-8 top-8 h-32 w-32 rounded-full border border-[#B9873F]/25 bg-[#B9873F]/[0.04]" />
            <LogoMark
              tone="mono"
              className="absolute -bottom-14 -right-8 h-64 w-64 text-[#B9873F] opacity-[0.09]"
            />
          </div>

          <div className="relative z-10 max-w-md">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#746C5D]">
              <Lock className="h-3.5 w-3.5" />
              Local protection record
            </div>

            <p className="display mt-7 text-[5.5rem] leading-[0.82] tracking-[-0.045em]">
              {pinnedCount}
            </p>
            <p className="display mt-3 text-[1.8rem] leading-none">
              {pinnedCount === 1 ? 'name pinned' : 'names pinned'}
            </p>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[#615A4D]">
              Approved destinations live in this browser, partitioned by wallet and network.
              Certora never signs or sends a payment.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              {connected ? (
                <>
                  <button
                    onClick={() => navigate('/resolve')}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#17140D] px-4 text-[13.5px] font-medium text-[#F3F0E8] transition-colors hover:bg-[#2A251A]"
                  >
                    Resolve a name <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate('/recipients')}
                    className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#17140D]/20 px-4 text-[13.5px] font-medium text-[#17140D] transition-colors hover:bg-[#17140D]/[0.04]"
                  >
                    View recipients
                  </button>
                </>
              ) : providerAvailable ? (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#17140D] px-4 text-[13.5px] font-medium text-[#F3F0E8] transition-colors hover:bg-[#2A251A] disabled:opacity-50"
                >
                  {connecting ? 'Connecting…' : 'Connect wallet'}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/resolve')}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#17140D] px-4 text-[13.5px] font-medium text-[#F3F0E8] transition-colors hover:bg-[#2A251A]"
                >
                  View setup steps <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#CFC7B7] pt-4 text-[10.5px] text-[#746C5D]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B9873F]" />
                Beldex Testnet
              </span>
              <span>{connected ? 'Wallet connected' : 'Wallet not connected'}</span>
              <span>No payments signed</span>
            </div>
          </div>
        </section>

        <div className="grid gap-5">
          <Card className="flex flex-col justify-between gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Wallet</p>
                <p className="mt-2 text-[15px] font-medium text-chalk">
                  {connected ? 'Connected' : 'Not connected'}
                </p>
              </div>
              <StatusPill tone={connected ? 'success' : 'neutral'} dot>
                {connected ? 'Live session' : 'Offline'}
              </StatusPill>
            </div>

            {connected && address ? (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-[#0B0E12] p-3">
                <Identicon value={address} size={34} />
                <div className="min-w-0 flex-1">
                  <Address address={address} shortened showCopy size="sm" />
                  <p className="mt-1 text-[10.5px] text-ash">
                    {network === 'testnet' ? 'Beldex Testnet' : network ?? 'Unknown network'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-smoke">
                {providerAvailable
                  ? 'Connect the Beldex Wallet extension to resolve names and manage pins.'
                  : 'The Beldex Wallet extension was not detected. Install it, unlock it, and reload this page.'}
              </p>
            )}

            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ash transition-colors hover:text-chalk"
            >
              Wallet settings <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <p className="eyebrow">Protection pulse</p>
              <StatusPill tone={changes > 0 ? 'warning' : 'neutral'}>
                This session
              </StatusPill>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-[#0B0E12] p-3.5">
                <p className="display text-[2rem] leading-none text-chalk">{rechecks}</p>
                <p className="mt-2 text-[10.5px] leading-snug text-ash">
                  Rechecks run
                </p>
              </div>
              <div className="rounded-xl border border-line bg-[#0B0E12] p-3.5">
                <p
                  className={`display text-[2rem] leading-none ${
                    changes > 0 ? 'text-warning' : 'text-chalk'
                  }`}
                >
                  {changes}
                </p>
                <p className="mt-2 text-[10.5px] leading-snug text-ash">
                  Changes detected
                </p>
              </div>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-ash">
              {rechecks === 0
                ? 'Open a protected recipient and run a fresh recheck to populate this session.'
                : changes === 0
                  ? 'No destination changes detected in this session.'
                  : 'A changed destination needs explicit review and approval.'}
            </p>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
            <div>
              <p className="eyebrow">Protected recipients</p>
              <p className="mt-1 text-[13px] text-smoke">
                {pinnedCount === 0
                  ? 'No names pinned yet'
                  : `${pinnedCount} ${pinnedCount === 1 ? 'name' : 'names'} under watch`}
              </p>
            </div>
            <Link
              to="/recipients"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ash transition-colors hover:text-chalk"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {pinnedCount === 0 ? (
            <EmptyState
              compact
              icon={ShieldCheck}
              title="No recipients pinned yet"
              description="Resolve a BNS name and approve its destination to start protecting it."
              action={
                <Button variant="ghost" onClick={() => navigate('/resolve')}>
                  Resolve a name
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line/60">
              {recipients.slice(0, 5).map((recipient) => (
                <li key={recipient.id}>
                  <Link
                    to={`/recipients/${recipient.id}`}
                    className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
                  >
                    <Identicon value={recipient.destination} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-chalk">
                        {recipient.name}
                      </p>
                      <Address
                        address={recipient.destination}
                        shortened
                        showCopy={false}
                        size="sm"
                        className="mt-0.5 text-ash"
                      />
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-ash">Approved</p>
                      <p className="mt-0.5 text-[11px] text-smoke">
                        {relativeTime(recipient.approvedAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ash transition-transform group-hover:translate-x-0.5 group-hover:text-smoke" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {pinnedCount > 5 && (
            <div className="border-t border-line/60 px-5 py-3">
              <Link
                to="/recipients"
                className="text-[11.5px] font-medium text-gold hover:text-gold-soft"
              >
                +{pinnedCount - 5} more protected names
              </Link>
            </div>
          )}
        </Card>

        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
            <div>
              <p className="eyebrow">Session activity</p>
              <p className="mt-1 text-[13px] text-smoke">Local, in-memory events</p>
            </div>
            <Link
              to="/activity"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ash transition-colors hover:text-chalk"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="p-5">
            {activity.length === 0 ? (
              <EmptyState
                compact
                icon={Wallet}
                title="No activity yet"
                description="Wallet connections, resolutions, pins, and rechecks will appear here."
              />
            ) : (
              <ActivityList events={activity} limit={4} />
            )}
          </div>
        </Card>
      </div>

      <section className="rounded-2xl border border-line bg-white/[0.012] p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-gold/80" />
            <p className="text-[12px] font-medium text-smoke">
              How the protection loop works
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 md:flex-1 md:gap-8 md:pl-10">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-raised text-gold">
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                  </span>
                  <div>
                    <p className="text-[11.5px] font-medium text-chalk">
                      <span className="mr-1.5 font-mono text-[10px] text-ash">
                        0{index + 1}
                      </span>
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-ash">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
