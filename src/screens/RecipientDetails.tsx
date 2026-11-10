import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Fingerprint,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useResolver } from '../hooks/useResolver';
import { useCertora } from '../state/CertoraProvider';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Address } from '../components/ui/Address';
import { CopyButton } from '../components/ui/CopyButton';
import { ConfirmDialog } from '../components/ui/Dialog';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';
import { Identicon } from '../components/ui/Identicon';
import { useToast } from '../components/ui/Toast';
import { formatDateTime } from '../lib/format';
import {
  generateFingerprint,
  compareResolutionToPin,
  type RecipientStatus,
} from '@certora/core';

type StatusTone = 'neutral' | 'gold' | 'success' | 'warning' | 'critical';

type StatusConfig = {
  text: string;
  pill: string;
  tone: StatusTone;
  icon: React.ElementType;
};

const statusLabel: Record<RecipientStatus, StatusConfig> = {
  UNPINNED: {
    text: 'Not rechecked yet',
    pill: 'Not checked',
    tone: 'neutral',
    icon: RefreshCw,
  },
  MATCHES_PIN: {
    text: 'Matches your approved recipient',
    pill: 'Matches',
    tone: 'success',
    icon: CheckCircle2,
  },
  DESTINATION_CHANGED: {
    text: 'Destination changed since approval',
    pill: 'Changed',
    tone: 'warning',
    icon: AlertTriangle,
  },
  RESOLUTION_UNAVAILABLE: {
    text: 'Resolution unavailable',
    pill: 'Unavailable',
    tone: 'critical',
    icon: ShieldAlert,
  },
  NETWORK_MISMATCH: {
    text: 'Network mismatch',
    pill: 'Wrong network',
    tone: 'warning',
    icon: ShieldAlert,
  },
  INVALID_NAME: {
    text: 'Invalid name',
    pill: 'Invalid name',
    tone: 'critical',
    icon: ShieldAlert,
  },
};

export function RecipientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { connection, getWeb3 } = useWallet();
  const web3 = getWeb3();
  const {
    recipients,
    touchRecipient,
    updateRecipient,
    removeRecipient,
    addActivity,
  } = useCertora();
  const { add, clear: clearToasts } = useToast();

  const { resolution, loading: resolving, resolve, error: resolveError } = useResolver(web3);

  const connected = connection?.connected ?? false;
  const isTestnet = connection?.network === 'testnet';
  const network = connection?.network ?? null;
  const account = connection?.address ?? null;

  const pin = React.useMemo(() => recipients.find((p) => p.id === id), [recipients, id]);
  const [recheckStatus, setRecheckStatus] = React.useState<RecipientStatus | null>(null);
  const [reapproveDialog, setReapproveDialog] = React.useState<{
    oldDestination: string;
    newDestination: string;
  } | null>(null);
  const [removeDialog, setRemoveDialog] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const handleRemove = async () => {
    if (!pin) return;
    setRemoving(true);
    try {
      await removeRecipient(pin.id);
      add({ type: 'info', title: 'Recipient removed', description: pin.name });
      navigate('/recipients');
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

  const handleRecheck = async () => {
    if (!pin || !connected || !isTestnet || !account || !network) return;
    clearToasts();
    setRecheckStatus(null);
    try {
      const result = await resolve(pin.name, 'testnet');
      if (!result) {
        // A failed or unavailable resolution must never alter the pin.
        setRecheckStatus('RESOLUTION_UNAVAILABLE');
        addActivity({ type: 'resolution_failed', name: pin.name });
        add({
          type: 'error',
          title: 'Recheck failed',
          description: 'A fresh resolution was unavailable. Your approved pin is preserved.',
        });
        return;
      }

      const comparison = await compareResolutionToPin(result, pin);
      setRecheckStatus(comparison.status);
      await touchRecipient(pin.id);

      addActivity({
        type: 'recipient_rechecked',
        name: result.name,
        destination: result.destination,
        status: comparison.status,
      });

      if (comparison.status === 'DESTINATION_CHANGED') {
        add({
          type: 'warning',
          title: 'Destination changed',
          description: `${pin.name} now resolves to a different address.`,
        });
      } else if (comparison.status === 'MATCHES_PIN') {
        add({
          type: 'success',
          title: 'Destination unchanged',
          description: 'Matches your approved recipient.',
        });
      }
    } catch (err) {
      setRecheckStatus('RESOLUTION_UNAVAILABLE');
      add({
        type: 'error',
        title: 'Recheck failed',
        description: err instanceof Error ? err.message : String(err),
      });
      addActivity({
        type: 'resolution_failed',
        name: pin.name,
      });
    }
  };

  const handleReapprove = async () => {
    if (!pin || !reapproveDialog || !account || !network) return;
    clearToasts();
    try {
      const fingerprint = await generateFingerprint({
        version: 'certora-v1',
        network: network as 'testnet',
        name: pin.name,
        mappingType: pin.mappingType,
        destination: reapproveDialog.newDestination,
      });
      await updateRecipient(pin.id, {
        name: pin.name,
        mappingType: pin.mappingType,
        destination: reapproveDialog.newDestination,
        fingerprint,
        approvedAt: Date.now(),
        lastCheckedAt: Date.now(),
      });
      addActivity({
        type: 'destination_approved',
        name: pin.name,
        previousDestination: reapproveDialog.oldDestination,
        newDestination: reapproveDialog.newDestination,
      });
      add({
        type: 'success',
        title: 'Destination approved',
        description: 'Pin updated to the new address.',
      });
      setReapproveDialog(null);
      setRecheckStatus('MATCHES_PIN');
    } catch (err) {
      add({
        type: 'error',
        title: 'Approval failed',
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  if (!connected) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Recipient record"
          title={
            <>
              Recipient <em className="italic text-gold">details.</em>
            </>
          }
        />
        <Card padded={false}>
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-line-strong bg-raised text-ash">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <h2 className="text-[15px] font-medium text-chalk">Connect your wallet</h2>
            <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-smoke">
              Connect the Beldex Testnet wallet that owns this protection record.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!pin) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Recipient record"
          title={
            <>
              Recipient <em className="italic text-gold">not found.</em>
            </>
          }
        />
        <Card padded={false}>
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-critical/25 bg-critical/[0.08] text-critical">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <h2 className="text-[15px] font-medium text-chalk">Recipient not found</h2>
            <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-smoke">
              This record may have been removed, or it belongs to a different wallet account.
            </p>
            <Link
              to="/recipients"
              className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-gold hover:text-gold-soft"
            >
              Back to protected recipients
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const statusInfo = statusLabel[recheckStatus ?? ('UNPINNED' as RecipientStatus)];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-7">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-ash">
        <Link
          to="/recipients"
          className="rounded transition-colors hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
        >
          Protected recipients
        </Link>
        <ChevronRight className="h-3 w-3 text-line-strong" />
        <span className="truncate font-mono text-smoke">{pin.name}</span>
      </nav>

      <PageHeader
        eyebrow="Recipient record"
        title={pin.name}
        description="This is the exact destination you approved. Rechecks compare a fresh wallet resolution against this record — and leave the pin untouched if anything is uncertain."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleRecheck}
              disabled={resolving || !isTestnet}
            >
              {resolving ? (
                'Checking…'
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Recheck destination
                </>
              )}
            </Button>
            <Button variant="danger" onClick={() => setRemoveDialog(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </>
        }
      />

      {!isTestnet && (
        <Card className="border-critical/25">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
            <p className="text-[12.5px] leading-relaxed text-smoke">
              Certora requires Beldex Testnet. Current network:{' '}
              <span className="font-medium text-critical">{network ?? 'unknown'}</span>. Rechecks
              are disabled until the wallet is on Testnet.
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-5">
          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5 md:px-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-gold/20 bg-gold/[0.06] text-gold">
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <p className="eyebrow">Approved destination</p>
              </div>
              <StatusPill tone="gold" dot>
                Pinned locally
              </StatusPill>
            </div>

            <div className="p-5 md:p-6">
              <div className="flex items-start gap-4">
                <Identicon value={pin.destination} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-ash">
                    Exact wallet address
                  </p>
                  <div className="mt-2 rounded-xl border border-line-strong bg-[#0B0E12] p-3.5">
                    <Address address={pin.destination} showCopy size="lg" />
                  </div>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line/80 bg-white/[0.018] px-3 py-2.5">
                  <dt className="text-[9.5px] uppercase tracking-[0.14em] text-ash">Network</dt>
                  <dd className="mt-1 text-[11.5px] font-medium capitalize text-gold">
                    {pin.network}
                  </dd>
                </div>
                <div className="rounded-lg border border-line/80 bg-white/[0.018] px-3 py-2.5">
                  <dt className="text-[9.5px] uppercase tracking-[0.14em] text-ash">Mapping</dt>
                  <dd className="mt-1 text-[11.5px] font-medium capitalize text-smoke">
                    {pin.mappingType}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <p className="eyebrow">Integrity check</p>
                {recheckStatus && (
                  <StatusPill tone={statusInfo.tone} dot>
                    {statusInfo.pill}
                  </StatusPill>
                )}
              </div>
              {resolving && (
                <span className="inline-flex items-center gap-1.5 text-[10.5px] text-ash">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Fresh resolution
                </span>
              )}
            </div>

            <div className="mt-4 flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  statusInfo.tone === 'success'
                    ? 'border-success/25 bg-success/[0.08] text-success'
                    : statusInfo.tone === 'warning'
                      ? 'border-warning/25 bg-warning/[0.08] text-warning'
                      : statusInfo.tone === 'critical'
                        ? 'border-critical/25 bg-critical/[0.08] text-critical'
                        : 'border-line-strong bg-raised text-smoke'
                }`}
              >
                <StatusIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-medium tracking-[-0.01em] text-chalk">
                  {statusInfo.text}
                </h2>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ash">
                  {recheckStatus === 'MATCHES_PIN'
                    ? 'The fresh resolution returned the same destination that is pinned here. No action is required.'
                    : recheckStatus === 'DESTINATION_CHANGED'
                      ? 'The name now resolves to a different address. Your original pin has not been changed.'
                      : recheckStatus === 'RESOLUTION_UNAVAILABLE'
                        ? 'A fresh resolution could not be completed. Your approved pin is preserved.'
                        : recheckStatus === 'NETWORK_MISMATCH'
                          ? 'The resolution was performed on a different network than this pin.'
                          : recheckStatus === 'INVALID_NAME'
                            ? 'The stored name is no longer considered valid by the BNS validator.'
                            : 'Run a recheck to compare a fresh resolution against this record.'}
                </p>
              </div>
            </div>

            {recheckStatus === 'DESTINATION_CHANGED' && resolution && (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-[#0B0E12] p-3.5">
                    <p className="text-[9.5px] uppercase tracking-[0.14em] text-ash">
                      Previously approved
                    </p>
                    <div className="mt-2">
                      <Address address={pin.destination} showCopy={false} size="sm" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-warning/30 bg-warning/[0.05] p-3.5">
                    <p className="text-[9.5px] uppercase tracking-[0.14em] text-warning">
                      Resolved now
                    </p>
                    <div className="mt-2">
                      <Address address={resolution.destination} showCopy={false} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg border border-warning/20 bg-warning/[0.04] p-3.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p className="text-[11px] leading-relaxed text-smoke">
                    Do not send funds to either address until you have verified the change out of
                    band. Approving replaces the local pin with the newly resolved destination.
                  </p>
                </div>

                <Button
                  onClick={() =>
                    setReapproveDialog({
                      oldDestination: pin.destination,
                      newDestination: resolution.destination,
                    })
                  }
                  disabled={!!reapproveDialog}
                >
                  Review &amp; approve new destination
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {recheckStatus === 'RESOLUTION_UNAVAILABLE' && resolveError && (
              <div className="mt-4 rounded-lg border border-critical/20 bg-critical/[0.04] p-3">
                <p className="break-words text-[11px] leading-relaxed text-critical/90">
                  {resolveError}
                </p>
              </div>
            )}

            {!recheckStatus && !resolving && (
              <p className="mt-4 border-t border-line/70 pt-4 text-[10.5px] leading-relaxed text-ash">
                Rechecks always request a new resolution from your Beldex Wallet. Cached or
                previous results are never reused.
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between">
              <p className="eyebrow">Protection record</p>
              <Fingerprint className="h-4 w-4 text-ash" strokeWidth={1.7} />
            </div>

            <dl className="mt-4 space-y-3.5">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-[11.5px] text-ash">Status</dt>
                <dd>
                  <StatusPill tone={statusInfo.tone} dot>
                    {statusInfo.pill}
                  </StatusPill>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-[11.5px] text-ash">Approved</dt>
                <dd className="text-right text-[11px] text-smoke">
                  {formatDateTime(pin.approvedAt)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-[11.5px] text-ash">
                  <Clock3 className="h-3 w-3" /> Last checked
                </dt>
                <dd className="text-right text-[11px] text-smoke">
                  {pin.lastCheckedAt ? formatDateTime(pin.lastCheckedAt) : 'Never'}
                </dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-line/70 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9.5px] uppercase tracking-[0.14em] text-ash">
                  Fingerprint
                </p>
                <CopyButton address={pin.fingerprint} />
              </div>
              <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-smoke">
                {pin.fingerprint}
              </p>
              <p className="mt-2 text-[9.5px] leading-relaxed text-ash">
                SHA-256 over the pinned name, network, mapping type, and destination.
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold/80" strokeWidth={1.7} />
              <p className="eyebrow">What this record proves</p>
            </div>
            <ul className="mt-4 space-y-3.5">
              <li className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                <p className="text-[11px] leading-relaxed text-smoke">
                  <span className="font-medium text-chalk">Your approval.</span> This browser
                  stores the exact destination you reviewed and approved.
                </p>
              </li>
              <li className="flex gap-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <p className="text-[11px] leading-relaxed text-smoke">
                  <span className="font-medium text-chalk">Not identity.</span> A matching
                  mapping does not prove the recipient is trustworthy or verified.
                </p>
              </li>
              <li className="flex gap-2.5">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ash" />
                <p className="text-[11px] leading-relaxed text-smoke">
                  <span className="font-medium text-chalk">No on-chain proof.</span> BNS
                  resolution comes from your wallet&rsquo;s resolver; Certora cannot verify it
                  independently.
                </p>
              </li>
            </ul>
            <Link
              to="/settings"
              className="mt-4 inline-flex items-center gap-1 border-t border-line/70 pt-3.5 text-[10.5px] font-medium text-ash transition-colors hover:text-chalk"
            >
              Read the trust model
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Card>

          <div className="flex items-start gap-2 px-1 text-[10px] leading-relaxed text-ash">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
            Removing this record deletes the local pin only. The BNS mapping on-chain is not
            changed by Certora.
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!reapproveDialog}
        onConfirm={handleReapprove}
        onCancel={() => setReapproveDialog(null)}
        title="Approve new destination"
        description={
          reapproveDialog && (
            <div>
              <p className="text-[12.5px] leading-relaxed text-smoke">
                The BNS name <span className="font-mono text-chalk">{pin.name}</span> now resolves
                to a different address. Review and confirm the replacement:
              </p>
              <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-line bg-[#0B0E12] p-3">
                  <p className="text-[9.5px] uppercase tracking-[0.14em] text-ash">
                    Old (approved)
                  </p>
                  <div className="mt-1.5">
                    <Address address={reapproveDialog.oldDestination} showCopy={false} size="sm" />
                  </div>
                </div>
                <div className="rounded-lg border border-warning/25 bg-warning/[0.04] p-3">
                  <p className="text-[9.5px] uppercase tracking-[0.14em] text-warning">
                    New (resolved)
                  </p>
                  <div className="mt-1.5">
                    <Address address={reapproveDialog.newDestination} showCopy={false} size="sm" />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ash">
                Confirming replaces your saved pin with the new destination. This cannot be undone
                automatically.
              </p>
            </div>
          )
        }
        confirmLabel="Approve new destination"
        cancelLabel="Keep existing"
      />

      <ConfirmDialog
        open={removeDialog}
        onConfirm={handleRemove}
        onCancel={() => setRemoveDialog(false)}
        title="Remove protected recipient"
        variant="danger"
        busy={removing}
        confirmLabel="Remove recipient"
        cancelLabel="Keep recipient"
        description={
          <p>
            Remove <span className="font-mono text-chalk">{pin.name}</span> from your protected
            recipients? The approved destination will be deleted from local storage. You can pin
            it again later.
          </p>
        }
      />

      {resolving && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex items-center gap-2.5 rounded-full border border-line-strong bg-[#11151B]/95 px-4 py-2.5 shadow-pop backdrop-blur-xl">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-gold" />
            <span className="text-[11.5px] text-smoke">Performing a fresh resolution…</span>
          </div>
        </div>
      )}
    </div>
  );
}
