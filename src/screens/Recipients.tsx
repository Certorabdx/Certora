import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useCertora } from '../state/CertoraProvider';
import { useWallet } from '../hooks/useWallet';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Address } from '../components/ui/Address';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Dialog';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';
import { Identicon } from '../components/ui/Identicon';
import { useToast } from '../components/ui/Toast';
import { relativeTime } from '../lib/format';

const ROW_GRID =
  'md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_130px_84px]';

export function Recipients() {
  const { recipients, removeRecipient } = useCertora();
  const navigate = useNavigate();
  const { connection, providerAvailable, connecting, connect } = useWallet();
  const { add } = useToast();

  const connected = connection?.connected ?? false;
  const network = connection?.network ?? null;
  const [search, setSearch] = React.useState('');
  const [removeTarget, setRemoveTarget] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [removing, setRemoving] = React.useState(false);

  const filtered = recipients.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.destination.toLowerCase().includes(search.toLowerCase()),
  );

  const handleConnect = async () => {
    try {
      await connect();
    } catch {
      // Error is surfaced through the shared wallet context.
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeRecipient(removeTarget.id);
      add({ type: 'info', title: 'Recipient removed', description: removeTarget.name });
      setRemoveTarget(null);
    } catch (err) {
      add({
        type: 'error',
        title: 'Remove failed',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRemoving(false);
    }
  };

  if (!connected) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Protection registry"
          title={
            <>
              Protected <em className="italic text-gold">recipients.</em>
            </>
          }
          description="Every name you approve is pinned locally, then checked against fresh resolutions on demand."
        />
        <Card padded={false}>
          <EmptyState
            icon={ShieldAlert}
            title="Connect your wallet"
            description="Connect a Beldex Testnet wallet to view the recipients pinned for this account."
            action={
              providerAvailable ? (
                <Button onClick={handleConnect} isLoading={connecting}>
                  Connect Beldex Wallet
                </Button>
              ) : (
                <StatusPill tone="warning" dot>
                  Beldex Wallet not detected
                </StatusPill>
              )
            }
          />
        </Card>
      </div>
    );
  }

  if (network !== 'testnet') {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Protection registry"
          title={
            <>
              Protected <em className="italic text-gold">recipients.</em>
            </>
          }
        />
        <Card className="border-critical/25">
          <EmptyState
            icon={ShieldAlert}
            title="Wrong network"
            description={`Certora requires Beldex Testnet. Current network: ${network ?? 'unknown'}. Switch networks in your wallet and reconnect.`}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Protection registry"
        title={
          <>
            Protected <em className="italic text-gold">recipients.</em>
          </>
        }
        description="Recipients you have explicitly approved. Certora keeps the exact destination in this browser and checks it against fresh resolutions when you ask."
        actions={
          <>
            {recipients.length > 0 && (
              <StatusPill tone="neutral">{recipients.length} pinned</StatusPill>
            )}
            <Button onClick={() => navigate('/resolve')}>
              Resolve a name <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {recipients.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={ShieldCheck}
            title="No protected recipients"
            description="Resolve a BNS name and approve its destination to start protecting it. Pins are stored locally, separated by wallet and network."
            action={
              <Button onClick={() => navigate('/resolve')}>
                Resolve a name <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-sm">
              <Input
                icon={Search}
                aria-label="Search protected recipients"
                placeholder="Search by name or address"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center gap-3 text-[10.5px] text-ash">
              <span className="font-mono">
                {filtered.length} of {recipients.length}
              </span>
              <span className="h-3 w-px bg-line-strong" />
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Beldex Testnet
              </span>
            </div>
          </div>

          <Card padded={false} className="overflow-hidden">
            <div
              className={`hidden gap-4 border-b border-line/70 px-5 py-3 text-[9.5px] font-medium uppercase tracking-[0.16em] text-ash md:grid ${ROW_GRID}`}
            >
              <span>Name</span>
              <span>Approved destination</span>
              <span>Approved</span>
              <span className="text-right">Action</span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                compact
                icon={Search}
                title="No matching recipients"
                description="Try a different name or address."
                action={
                  <Button variant="ghost" onClick={() => setSearch('')}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <ul>
                {filtered.map((r) => (
                  <li
                    key={r.id}
                    className="relative border-b border-line/60 last:border-b-0"
                  >
                    <div
                      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-white/[0.022] md:gap-4 md:px-5 ${ROW_GRID}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Identicon value={r.destination} size={34} />
                        <div className="min-w-0">
                          <Link
                            to={`/recipients/${r.id}`}
                            className="inline-block max-w-full truncate rounded text-[13px] font-medium text-chalk transition-colors after:absolute after:inset-0 after:rounded-lg hover:text-gold focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-gold/60"
                          >
                            {r.name}
                          </Link>
                          <div className="mt-1 md:hidden">
                            <Address
                              address={r.destination}
                              shortened
                              showCopy={false}
                              size="sm"
                              className="text-ash"
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-ash md:hidden">
                            Approved {relativeTime(r.approvedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="hidden min-w-0 md:block">
                        <Address
                          address={r.destination}
                          shortened
                          showCopy={false}
                          size="sm"
                          className="text-smoke"
                        />
                      </div>

                      <div className="hidden md:block">
                        <p className="text-[11px] text-smoke">
                          {relativeTime(r.approvedAt)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-ash">
                          {r.lastCheckedAt ? `Checked ${relativeTime(r.lastCheckedAt)}` : 'Never checked'}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setRemoveTarget({ id: r.id, name: r.name })}
                          aria-label={`Remove ${r.name}`}
                          title="Remove recipient"
                          className="relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-ash transition-colors hover:border-critical/25 hover:bg-critical/[0.08] hover:text-critical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-critical/50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight
                          aria-hidden="true"
                          className="h-4 w-4 text-ash/70"
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <p className="px-1 text-[10px] leading-relaxed text-ash">
            Selecting a row opens its protection record. Removing a recipient deletes the local
            pin only — it does not change the BNS mapping on-chain.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
        title="Remove protected recipient"
        variant="danger"
        busy={removing}
        confirmLabel="Remove recipient"
        cancelLabel="Keep recipient"
        description={
          <p>
            Remove <span className="font-mono text-chalk">{removeTarget?.name}</span> from your
            protected recipients? The approved destination will be deleted from local storage.
            You can pin it again later.
          </p>
        }
      />
    </div>
  );
}
