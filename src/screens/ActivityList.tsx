import type { ElementType } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Link2,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Trash2,
  UserPlus,
  Wallet,
} from 'lucide-react';
import type { ActivityEvent, RecipientStatus } from '@certora/core';
import { StatusPill } from '../components/ui/StatusPill';
import { dayLabel, relativeTime } from '../lib/format';

interface ActivityListProps {
  events: ActivityEvent[];
  limit?: number;
  grouped?: boolean;
}

interface EventConfig {
  label: string;
  icon: ElementType;
  tone: 'neutral' | 'gold' | 'success' | 'warning' | 'critical';
}

const eventConfig: Record<string, EventConfig> = {
  wallet_connected: { label: 'Wallet connected', icon: UserPlus, tone: 'success' },
  wallet_disconnected: { label: 'Wallet disconnected', icon: Link2, tone: 'neutral' },
  name_resolved: { label: 'Name resolved', icon: ScanSearch, tone: 'gold' },
  recipient_pinned: { label: 'Recipient pinned', icon: ShieldCheck, tone: 'success' },
  recipient_rechecked: { label: 'Fresh recheck completed', icon: RefreshCw, tone: 'gold' },
  destination_changed: { label: 'Destination changed', icon: AlertTriangle, tone: 'warning' },
  destination_approved: { label: 'Destination approved', icon: CheckCircle2, tone: 'success' },
  recipient_removed: { label: 'Recipient removed', icon: Trash2, tone: 'critical' },
  resolution_failed: { label: 'Resolution failed', icon: AlertTriangle, tone: 'critical' },
  network_changed: { label: 'Network changed', icon: Wallet, tone: 'warning' },
  account_changed: { label: 'Account changed', icon: UserPlus, tone: 'neutral' },
};

const statusPill: Record<
  RecipientStatus,
  { label: string; tone: 'success' | 'warning' | 'critical' | 'neutral' }
> = {
  UNPINNED: { label: 'Not rechecked', tone: 'neutral' },
  MATCHES_PIN: { label: 'Matches pin', tone: 'success' },
  DESTINATION_CHANGED: { label: 'Changed', tone: 'warning' },
  RESOLUTION_UNAVAILABLE: { label: 'Unavailable', tone: 'critical' },
  NETWORK_MISMATCH: { label: 'Network mismatch', tone: 'warning' },
  IDENTITY_MISMATCH: { label: 'Identity mismatch', tone: 'critical' },
  INVALID_NAME: { label: 'Invalid name', tone: 'critical' },
};

const toneClasses = {
  neutral: 'border-line-strong bg-raised text-smoke',
  gold: 'border-gold/20 bg-gold/[0.07] text-gold',
  success: 'border-success/20 bg-success/[0.07] text-success',
  warning: 'border-warning/20 bg-warning/[0.07] text-warning',
  critical: 'border-critical/20 bg-critical/[0.07] text-critical',
};

function Timeline({ events }: { events: ActivityEvent[] }) {
  return (
    <ol>
      {events.map((event, index) => {
        const config = eventConfig[event.type] ?? {
          label: 'Activity',
          icon: Clock,
          tone: 'neutral' as const,
        };
        const Icon = config.icon;
        const status = event.status ? statusPill[event.status] : null;
        const cleared =
          typeof event.metadata?.clearedCount === 'number'
            ? `${event.metadata.clearedCount} local pins cleared`
            : null;

        return (
          <li key={event.id} className="relative flex gap-3.5 pb-5 last:pb-0">
            {index < events.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[13px] top-8 h-[calc(100%-24px)] w-px bg-line/80"
              />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${toneClasses[config.tone]}`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-[12.5px] font-medium text-chalk">{config.label}</p>
                <time className="text-[10px] text-ash" dateTime={new Date(event.timestamp).toISOString()}>
                  {relativeTime(event.timestamp)}
                </time>
              </div>
              {(event.name || cleared) && (
                <p className="mt-0.5 truncate font-mono text-[11px] text-smoke">
                  {event.name ?? cleared}
                </p>
              )}
              {status && event.type !== 'recipient_pinned' && (
                <div className="mt-1.5">
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityList({ events, limit, grouped = true }: ActivityListProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Clock className="mb-2 h-7 w-7 text-ash" />
        <p className="text-[12.5px] text-smoke">No activity yet.</p>
      </div>
    );
  }

  const visible = limit ? events.slice(0, limit) : events;

  if (!grouped) {
    return <Timeline events={visible} />;
  }

  const groups: Array<{ label: string; events: ActivityEvent[] }> = [];
  for (const event of visible) {
    const label = dayLabel(event.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="eyebrow mb-3">{group.label}</p>
          <Timeline events={group.events} />
        </div>
      ))}
    </div>
  );
}
