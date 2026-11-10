import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Fingerprint,
  Lock,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useResolver } from '../hooks/useResolver';
import { useCertora } from '../state/CertoraProvider';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Address } from '../components/ui/Address';
import { ConfirmDialog } from '../components/ui/Dialog';
import { Loading } from '../components/ui/Loading';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';
import { useToast } from '../components/ui/Toast';
import { makeFingerprintInput, generateFingerprint } from '@certora/core';
import { validateBnsName, type BnsNameValidation } from '@certora/beldex-adapter';

const TRUST_POINTS = [
  {
    icon: ShieldAlert,
    title: 'Verified is always false',
    body: 'Certora resolves through your wallet’s configured resolver. No independent on-chain proof is claimed.',
  },
  {
    icon: Fingerprint,
    title: 'The exact address is pinned',
    body: 'A SHA-256 fingerprint binds the name, network, mapping type, and full destination.',
  },
  {
    icon: Lock,
    title: 'Pins never replace themselves',
    body: 'A changed destination stays pending until you explicitly review and approve it.',
  },
];

export function Resolve() {
  const {
    connection,
    connect,
    isTestnet,
    getWeb3,
    providerAvailable,
    detecting,
    connecting,
  } = useWallet();
  const { addRecipient, recipients, account, network } = useCertora();
  const { add } = useToast();
  const navigate = useNavigate();

  const web3 = getWeb3();
  const { resolution, loading, error, resolve, clear } = useResolver(web3);

  const [name, setName] = React.useState('');
  const [validation, setValidationLocal] = React.useState<BnsNameValidation | null>(null);
  const [pinDialog, setPinDialog] = React.useState<{
    name: string;
    destination: string;
  } | null>(null);
  const [pinning, setPinning] = React.useState(false);

  // Keep validation in sync as the user types so the Resolve button reflects
  // whether the current input is acceptable.
  React.useEffect(() => {
    setValidationLocal(validateBnsName(name));
  }, [name]);

  const connected = connection?.connected ?? false;
  const existing = recipients.find(
    (r) => r.name.toLowerCase() === name.trim().toLowerCase() && r.network === network,
  );

  const handleResolve = async () => {
    if (!connected || !isTestnet) return;
    await resolve(name, 'testnet');
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch {
      // Error is surfaced through the shared wallet context.
    }
  };

  const handlePin = async () => {
    if (!resolution || !account || !network || !pinDialog) return;
    setPinning(true);
    try {
      const fingerprintInput = makeFingerprintInput({
        name: resolution.name,
        network,
        mappingType: resolution.mappingType,
        destination: resolution.destination,
      });
      const fingerprint = await generateFingerprint(fingerprintInput);

      await addRecipient({
        name: resolution.name,
        mappingType: resolution.mappingType,
        destination: resolution.destination,
        fingerprint,
        approvedAt: Date.now(),
        lastCheckedAt: Date.now(),
      });
      add({ type: 'success', title: 'Recipient pinned', description: resolution.name });
      setPinDialog(null);
      navigate('/recipients');
    } catch (err) {
      add({
        type: 'error',
        title: 'Pin failed',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPinning(false);
    }
  };

  const headerActions = (
    <StatusPill tone="gold" dot>
      Beldex Testnet only
    </StatusPill>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resolution desk"
        title={
          <>
            Resolve a <em className="italic text-gold">name.</em>
          </>
        }
        description="Read a Beldex Name Service name through your wallet, inspect the exact destination, then decide whether to protect it. Nothing is pinned without your approval."
        actions={headerActions}
      />

      {!connected && (
        <Card padded={false} className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-line/60" />
            <div className="absolute -right-6 -top-10 h-52 w-52 rounded-full border border-line/50" />
            <div className="absolute right-10 top-6 h-28 w-28 rounded-full border border-gold/15 bg-gold/[0.03]" />
          </div>

          <div className="relative grid gap-8 p-7 md:grid-cols-[1.1fr_0.9fr] md:p-10">
            <div>
              <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.07] text-gold">
                <Wallet className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <p className="eyebrow">Wallet required</p>
              <h2 className="display mt-2 text-[2.2rem] leading-[1.05] text-chalk md:text-[2.5rem]">
                Connect to resolve.
              </h2>
              <p className="mt-3 max-w-md text-[13px] leading-relaxed text-smoke">
                Certora reads BNS names through the Beldex Wallet extension. The wallet must
                be unlocked and set to Beldex Testnet — Certora will never switch networks
                for you.
              </p>

              <div className="mt-6">
                {detecting ? (
                  <StatusPill tone="neutral" dot>
                    Looking for the Beldex Wallet extension
                  </StatusPill>
                ) : providerAvailable ? (
                  <Button onClick={handleConnect} isLoading={connecting} size="lg">
                    Connect Beldex Wallet
                  </Button>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/[0.05] p-3.5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <p className="text-[12px] leading-relaxed text-smoke">
                      <span className="font-medium text-warning">
                        Beldex Wallet extension not detected.
                      </span>{' '}
                      Install the extension, unlock it, then reload this page.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <ol className="space-y-4 self-center rounded-xl border border-line bg-[#0B0E12] p-5">
              {[
                ['Install or unlock', 'Open the Beldex Wallet extension in this browser.'],
                ['Select Testnet', 'Certora rejects Mainnet and never switches silently.'],
                ['Resolve and review', 'Read the name, compare the address, then pin it.'],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised font-mono text-[10px] text-gold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium text-chalk">{title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-ash">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      )}

      {connected && !isTestnet && (
        <Card className="border-critical/25">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-critical/25 bg-critical/[0.08] text-critical">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[13.5px] font-medium text-chalk">Unsupported network</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-smoke">
                Connected to <span className="font-medium text-critical">{connection?.network}</span>.
                Certora requires Beldex Testnet. Switch networks in your wallet and reconnect —
                Certora will not change it for you.
              </p>
            </div>
          </div>
        </Card>
      )}

      {connected && isTestnet && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Card className="relative overflow-hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-line/40"
              />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Beldex Name Service</p>
                    <h2 className="display mt-1.5 text-[1.75rem] leading-none text-chalk">
                      Look up a recipient
                    </h2>
                  </div>
                  <StatusPill tone="gold" dot>
                    Testnet
                  </StatusPill>
                </div>

                <div className="mt-6">
                  <Input
                    label="BNS name"
                    placeholder="e.g. merchant.bdx"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleResolve();
                      }
                    }}
                    error={name.trim() ? validation?.reason : undefined}
                    hint="Lowercase letters, numbers, and hyphens. Must end in .bdx."
                    icon={ScanSearch}
                    className="h-12 font-mono text-[14.5px]"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={loading}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <Button
                    onClick={handleResolve}
                    disabled={loading || !validation?.valid}
                    className="min-w-[130px]"
                  >
                    {loading ? 'Resolving…' : 'Resolve'}
                  </Button>
                  <Button variant="ghost" onClick={clear} disabled={loading || !resolution}>
                    Clear
                  </Button>
                  <span className="ml-auto hidden items-center gap-1.5 text-[10.5px] text-ash sm:inline-flex">
                    <kbd className="kbd">Enter</kbd>
                    to resolve
                  </span>
                </div>
              </div>
            </Card>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-critical/25 bg-critical/[0.05] p-4"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
                <div>
                  <p className="text-[12.5px] font-medium text-critical">Resolution failed</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-smoke">{error}</p>
                </div>
              </div>
            )}

            {loading && !resolution && (
              <Card>
                <Loading message="Resolving BNS name…" />
              </Card>
            )}

            {resolution && (
              <Card padded={false} className="animate-fade-up overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5 md:px-6">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong bg-raised text-gold">
                      <ScanSearch className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </span>
                    <p className="eyebrow">Resolution receipt</p>
                  </div>
                  <StatusPill tone="warning" icon={ShieldAlert}>
                    verified: false
                  </StatusPill>
                </div>

                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="eyebrow">Name</p>
                      <p className="display mt-1.5 break-all text-[2.3rem] leading-none tracking-[-0.02em] text-chalk">
                        {resolution.name}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/[0.06] px-2.5 py-1 text-[10.5px] font-medium text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Fresh resolution
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl border border-line-strong bg-[#0B0E12] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="eyebrow">Wallet destination</p>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ash">
                        exact value
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <Address address={resolution.destination} showCopy size="lg" />
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ['Network', resolution.network],
                      ['Resolver', 'Beldex Wallet'],
                      ['Latency', `${resolution.durationMs} ms`],
                      ['Verified', 'No'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-line/80 bg-white/[0.018] px-3 py-2.5"
                      >
                        <dt className="text-[9.5px] uppercase tracking-[0.14em] text-ash">
                          {label}
                        </dt>
                        <dd
                          className={`mt-1 truncate text-[11.5px] font-medium ${
                            label === 'Network' ? 'capitalize text-gold' : 'text-smoke'
                          }`}
                          title={String(value)}
                        >
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-warning/15 bg-warning/[0.035] p-3.5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning/80" />
                    <p className="text-[11.5px] leading-relaxed text-smoke">
                      Resolved through the Beldex Wallet&rsquo;s configured resolver.
                      Independent on-chain verification is unavailable, so this result is
                      evidence from your wallet — not a blockchain proof. Compare the full
                      address before approving.
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-line/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    {existing ? (
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <p className="text-[12.5px] text-smoke">
                          <span className="font-medium text-success">Already protected.</span>{' '}
                          This name is already in your pinned recipients.
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={() =>
                          setPinDialog({
                            name: resolution.name,
                            destination: resolution.destination,
                          })
                        }
                        disabled={pinning}
                      >
                        {pinning ? 'Pinning…' : 'Approve & pin recipient'}
                        {!pinning && <ArrowRight className="h-4 w-4" />}
                      </Button>
                    )}
                    <p className="text-[10.5px] leading-relaxed text-ash">
                      Pins live in this browser only.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <aside className="space-y-5">
            <Card>
              <div className="flex items-center justify-between">
                <p className="eyebrow">Trust model</p>
                <ShieldCheck className="h-4 w-4 text-gold/70" strokeWidth={1.7} />
              </div>
              <h2 className="display mt-2 text-[1.7rem] leading-tight text-chalk">
                Evidence, not proof.
              </h2>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ash">
                Certora records what you approved and detects when that destination moves.
              </p>

              <ul className="mt-5 space-y-4">
                {TRUST_POINTS.map((point) => {
                  const Icon = point.icon;
                  return (
                    <li key={point.title} className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-raised text-gold">
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </span>
                      <div>
                        <p className="text-[11.5px] font-medium text-chalk">{point.title}</p>
                        <p className="mt-0.5 text-[10.5px] leading-relaxed text-ash">
                          {point.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card>
              <p className="eyebrow">This session</p>
              <dl className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11.5px] text-ash">Network</dt>
                  <dd>
                    <StatusPill tone="gold" dot>
                      Testnet
                    </StatusPill>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11.5px] text-ash">Resolver</dt>
                  <dd className="text-[11.5px] font-medium text-smoke">Beldex Wallet</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11.5px] text-ash">Pinned names</dt>
                  <dd className="font-mono text-[12px] text-chalk">{recipients.length}</dd>
                </div>
              </dl>

              <Link
                to="/recipients"
                className="mt-5 inline-flex items-center gap-1.5 border-t border-line/70 pt-4 text-[11.5px] font-medium text-smoke transition-colors hover:text-chalk"
              >
                View protected recipients
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Card>

            <div className="flex items-start gap-2 px-1 text-[10px] leading-relaxed text-ash">
              <RefreshCw className="mt-0.5 h-3 w-3 shrink-0" />
              Rechecks always perform a fresh resolution. Cached results are never reused.
            </div>
          </aside>
        </div>
      )}

      {pinDialog && (
        <ConfirmDialog
          open
          onConfirm={handlePin}
          onCancel={() => setPinDialog(null)}
          title="Approve recipient"
          busy={pinning}
          description={
            <div className="space-y-3">
              <p className="text-[13px] leading-relaxed text-smoke">
                You are about to approve and pin the destination for{' '}
                <span className="font-mono text-chalk">{pinDialog.name}</span>:
              </p>
              <div className="rounded-lg border border-line bg-[#0B0E12] p-3">
                <Address address={pinDialog.destination} showCopy={false} size="sm" />
              </div>
              <p className="text-[11.5px] leading-relaxed text-ash">
                Review the full address carefully. Certora will compare future resolutions
                against this exact value and warn you if it changes. It cannot be replaced
                automatically.
              </p>
            </div>
          }
          confirmLabel="Approve & pin"
          cancelLabel="Cancel"
        />
      )}
    </div>
  );
}
