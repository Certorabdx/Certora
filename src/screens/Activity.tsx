import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, ShieldCheck, Trash2 } from 'lucide-react';
import { useCertora } from '../state/CertoraProvider';
import { ActivityList } from './ActivityList';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Dialog';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';
import { useToast } from '../components/ui/Toast';

type Filter = 'all' | 'pins' | 'rechecks' | 'wallet';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pins', label: 'Pins' },
  { id: 'rechecks', label: 'Rechecks' },
  { id: 'wallet', label: 'Wallet' },
];

const FILTER_TYPES: Record<Exclude<Filter, 'all'>, string[]> = {
  pins: ['recipient_pinned', 'destination_approved', 'recipient_removed'],
  rechecks: [
    'name_resolved',
    'recipient_rechecked',
    'destination_changed',
    'resolution_failed',
  ],
  wallet: [
    'wallet_connected',
    'wallet_disconnected',
    'network_changed',
    'account_changed',
  ],
};

export function Activity() {
  const { activity, clearActivity } = useCertora();
  const { add } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState<Filter>('all');
  const [clearDialog, setClearDialog] = React.useState(false);

  const visible = React.useMemo(
    () =>
      filter === 'all'
        ? activity
        : activity.filter((event) => FILTER_TYPES[filter].includes(event.type)),
    [activity, filter],
  );

  const countFor = (id: Filter) =>
    id === 'all'
      ? activity.length
      : activity.filter((event) => FILTER_TYPES[id].includes(event.type)).length;

  const handleClear = () => {
    clearActivity();
    setClearDialog(false);
    setFilter('all');
    add({ type: 'info', title: 'Activity cleared' });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Local audit trail"
        title={
          <>
            Activity <em className="italic text-gold">ledger.</em>
          </>
        }
        description="A chronological record of wallet events, resolutions, pins, and rechecks from this session. Entries are held in memory and disappear when the page is reloaded."
        actions={
          activity.length > 0 ? (
            <Button variant="danger" onClick={() => setClearDialog(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear activity
            </Button>
          ) : undefined
        }
      />

      {activity.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={Clock3}
            title="No activity yet"
            description="Events such as wallet connections, resolutions, pins, and rechecks will appear here as you use Certora."
            action={
              <Button variant="ghost" onClick={() => navigate('/resolve')}>
                Resolve a name
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label="Filter activity"
              className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-line bg-[#0B0E12] p-1 sm:w-auto"
            >
              {FILTERS.map((item) => {
                const active = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(item.id)}
                    className={`inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[11.5px] font-medium transition-colors sm:flex-none ${
                      active
                        ? 'bg-raised text-chalk shadow-card'
                        : 'text-ash hover:bg-white/[0.03] hover:text-smoke'
                    }`}
                  >
                    {item.label}
                    <span
                      className={`font-mono text-[9.5px] ${
                        active ? 'text-gold' : 'text-ash/70'
                      }`}
                    >
                      {countFor(item.id)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-ash">
              <ShieldCheck className="h-3 w-3" />
              Newest first · session only
            </div>
          </div>

          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4 md:px-6">
              <div>
                <p className="eyebrow">Timeline</p>
                <p className="mt-1 text-[12px] text-smoke">
                  {visible.length} {visible.length === 1 ? 'event' : 'events'} shown
                </p>
              </div>
              <StatusPill tone="neutral">Beldex Testnet</StatusPill>
            </div>

            <div className="p-5 md:p-6">
              {visible.length === 0 ? (
                <EmptyState
                  compact
                  icon={Clock3}
                  title="Nothing in this filter"
                  description="No events of this type have been recorded in the current session."
                  action={
                    <Button variant="ghost" onClick={() => setFilter('all')}>
                      Show all activity
                    </Button>
                  }
                />
              ) : (
                <ActivityList events={visible} />
              )}
            </div>
          </Card>
        </div>
      )}

      <p className="px-1 text-[10px] leading-relaxed text-ash">
        Activity entries are evidence of local UI events only. They are not on-chain proofs and
        are not a substitute for reviewing addresses in your wallet.
      </p>

      <ConfirmDialog
        open={clearDialog}
        onConfirm={handleClear}
        onCancel={() => setClearDialog(false)}
        title="Clear activity"
        variant="danger"
        confirmLabel="Clear activity"
        cancelLabel="Keep activity"
        description={
          <p>
            This removes {activity.length} {activity.length === 1 ? 'entry' : 'entries'} from the
            in-memory activity ledger. Your pinned recipients are not affected.
          </p>
        }
      />
    </div>
  );
}
