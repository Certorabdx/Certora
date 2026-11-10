import * as React from 'react';
import {
  Database,
  ExternalLink,
  Fingerprint,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useCertora } from '../state/CertoraProvider';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Dialog';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';
import { Identicon } from '../components/ui/Identicon';
import { Address } from '../components/ui/Address';
import { useToast } from '../components/ui/Toast';

const VERSION = '0.1.0';

const LINKS = [
  { label: 'BNS Marketplace', href: 'https://bns.beldex.io/marketplace/' },
  { label: 'Beldex Testnet', href: 'https://testnet.beldex.dev/' },
  { label: 'Testnet Faucet', href: 'https://faucet.beldex.dev/' },
];

export function Settings() {
  const {
    connection,
    disconnect,
    providerAvailable,
    connecting,
    connect,
  } = useWallet();
  const { recipients, clearAllRecipients } = useCertora();
  const { add } = useToast();

  const connected = connection?.connected ?? false;
  const isTestnet = connection?.network === 'testnet';
  const [clearDialog, setClearDialog] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [disconnectDialog, setDisconnectDialog] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  const handleConnect = async () => {
    try {
      await connect();
    } catch {
      // Error is surfaced through the shared wallet context.
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnect();
      setDisconnectDialog(false);
      add({ type: 'info', title: 'Wallet disconnected' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearAllRecipients();
      add({ type: 'success', title: 'Pinned recipients cleared' });
    } catch (err) {
      add({
        type: 'error',
        title: 'Clear failed',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setClearing(false);
      setClearDialog(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuration"
        title={
          <>
            Settings <em className="italic text-gold">&amp; trust.</em>
          </>
        }
        description="Manage the wallet session and the pins stored in this browser. Certora holds no custody, signs no payments, and never asks for wallet secrets."
      />

      <div className="grid gap-5 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong bg-raised text-gold">
                  <Wallet className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <p className="eyebrow">Wallet connection</p>
              </div>
              <StatusPill tone={connected ? 'success' : 'neutral'} dot>
                {connected ? 'Connected' : 'Disconnected'}
              </StatusPill>
            </div>

            {connected ? (
              <>
                <div className="mt-5 flex items-center gap-3.5 rounded-xl border border-line bg-[#0B0E12] p-3.5">
                  <Identicon value={connection?.address ?? ''} size={38} />
                  <div className="min-w-0 flex-1">
                    <Address
                      address={connection?.address ?? ''}
                      shortened
                      showCopy
                      size="sm"
                    />
                    <p className="mt-1 text-[10.5px] text-ash">
                      {isTestnet ? 'Beldex Testnet' : `${connection?.network ?? 'Unknown'} — unsupported`}
                    </p>
                  </div>
                  <StatusPill tone={isTestnet ? 'gold' : 'critical'} dot>
                    {isTestnet ? 'Testnet' : 'Rejected'}
                  </StatusPill>
                </div>

                {!isTestnet && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-critical/20 bg-critical/[0.04] p-3">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-critical" />
                    <p className="text-[11px] leading-relaxed text-smoke">
                      Certora only operates on Beldex Testnet. Switch networks in your wallet and
                      reconnect. Mainnet is never used.
                    </p>
                  </div>
                )}

                <Button
                  variant="danger"
                  className="mt-4"
                  onClick={() => setDisconnectDialog(true)}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Disconnect wallet
                </Button>
              </>
            ) : (
              <>
                <p className="mt-3 text-[12.5px] leading-relaxed text-smoke">
                  {providerAvailable
                    ? 'Connect the Beldex Wallet extension on Testnet to resolve names and manage pins.'
                    : 'The Beldex Wallet extension was not detected. Install it, unlock it, then reload this page.'}
                </p>
                <div className="mt-4">
                  {providerAvailable ? (
                    <Button onClick={handleConnect} isLoading={connecting}>
                      Connect Beldex Wallet
                    </Button>
                  ) : (
                    <StatusPill tone="warning" dot>
                      Wallet not detected
                    </StatusPill>
                  )}
                </div>
              </>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-gold/80" strokeWidth={1.7} />
              <p className="eyebrow">Trust &amp; verification</p>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="flex gap-2.5">
                <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/80" />
                <p className="text-[11.5px] leading-relaxed text-smoke">
                  <span className="font-medium text-chalk">Resolution source.</span> Names are
                  resolved through the Beldex Wallet&rsquo;s configured resolver. Certora does
                  not run its own indexer.
                </p>
              </div>
              <div className="flex gap-2.5">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <p className="text-[11.5px] leading-relaxed text-smoke">
                  <span className="font-medium text-chalk">No on-chain claim.</span> BNS results
                  are not independently verified on-chain. Resolution objects always carry{' '}
                  <span className="rounded border border-warning/25 bg-warning/[0.07] px-1 py-0.5 font-mono text-[10px] text-warning">
                    verified: false
                  </span>
                  .
                </p>
              </div>
              <div className="flex gap-2.5">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ash" />
                <p className="text-[11.5px] leading-relaxed text-smoke">
                  <span className="font-medium text-chalk">Approval, not identity.</span> A pin is
                  evidence of the destination you approved — not proof that the recipient is safe
                  or authentic.
                </p>
              </div>
              <div className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success/80" />
                <p className="text-[11.5px] leading-relaxed text-smoke">
                  <span className="font-medium text-chalk">No payment signing.</span> Certora
                  never sends funds and never requests seed phrases or private keys.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong bg-raised text-gold">
                  <Database className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <p className="eyebrow">Local storage</p>
              </div>
              <StatusPill tone="neutral">This browser</StatusPill>
            </div>

            <div className="mt-5 flex items-end gap-3">
              <p className="display text-[2.8rem] leading-[0.85] text-chalk">
                {recipients.length}
              </p>
              <p className="pb-0.5 text-[11.5px] leading-snug text-ash">
                pinned {recipients.length === 1 ? 'recipient' : 'recipients'}
                <br />
                in IndexedDB
              </p>
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-line/70 pt-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] text-ash">Store</dt>
                <dd className="font-mono text-[10.5px] text-smoke">recipientPins</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] text-ash">Partitioned by</dt>
                <dd className="text-[10.5px] text-smoke">account + network</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] text-ash">Activity ledger</dt>
                <dd className="text-[10.5px] text-smoke">in-memory</dd>
              </div>
            </dl>

            <Button
              variant="danger"
              className="mt-5 w-full"
              onClick={() => setClearDialog(true)}
              disabled={recipients.length === 0 || clearing}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {clearing ? 'Clearing…' : 'Clear all pinned recipients'}
            </Button>
            <p className="mt-2 text-[9.5px] leading-relaxed text-ash">
              Deletes local pins for the connected account and network. On-chain BNS mappings are
              not changed.
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <p className="eyebrow">About Certora</p>
              <span className="font-mono text-[10px] text-ash">v{VERSION}</span>
            </div>

            <dl className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] text-ash">Product</dt>
                <dd className="text-[11px] font-medium text-smoke">Recipient protection</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] text-ash">Network</dt>
                <dd>
                  <StatusPill tone="gold" dot>
                    Beldex Testnet
                  </StatusPill>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] text-ash">SDK</dt>
                <dd className="font-mono text-[10.5px] text-smoke">@bdxi/web3js 1.0.2</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[11px] text-ash">Custody</dt>
                <dd className="text-[11px] text-smoke">None</dd>
              </div>
            </dl>

            <div className="mt-5 space-y-1 border-t border-line/70 pt-4">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-[11.5px] text-smoke transition-colors hover:bg-white/[0.04] hover:text-chalk"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3 text-ash" />
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-start gap-2 px-1 text-[10px] leading-relaxed text-ash">
        <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
        Testnet only. Certora rejects Mainnet connections and never switches networks on your
        behalf.
      </div>

      <ConfirmDialog
        open={disconnectDialog}
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectDialog(false)}
        title="Disconnect wallet"
        busy={disconnecting}
        confirmLabel="Disconnect"
        cancelLabel="Stay connected"
        description={
          <p>
            Certora will stop resolving names through this wallet session. Your locally pinned
            recipients are kept.
          </p>
        }
      />

      <ConfirmDialog
        open={clearDialog}
        onConfirm={handleClear}
        onCancel={() => setClearDialog(false)}
        title="Clear all pinned recipients"
        variant="danger"
        busy={clearing}
        description={
          <p>
            This permanently removes all {recipients.length} locally pinned{' '}
            {recipients.length === 1 ? 'recipient' : 'recipients'} for the connected account and
            network. This action cannot be undone. On-chain BNS mappings are not affected.
          </p>
        }
        confirmLabel="Clear all pins"
        cancelLabel="Cancel"
      />
    </div>
  );
}
