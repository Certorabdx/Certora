import * as React from 'react';
import {
  getPins,
  savePin,
  removePin,
  clearPins,
  updateLastChecked,
  validatePin,
  type RecipientPin,
  type ActivityEvent,
} from '@certora/core';
import type { Nettype } from '@certora/core';

interface CertoraContextValue {
  account: string | null;
  network: Nettype | null;
  recipients: RecipientPin[];
  activity: ActivityEvent[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setAccount: (account: string | null, network: Nettype | null) => Promise<void>;
  addRecipient: (pin: Omit<RecipientPin, 'id' | 'account' | 'network'>) => Promise<void>;
  updateRecipient: (
    id: string,
    pin: Omit<RecipientPin, 'id' | 'account' | 'network'>,
  ) => Promise<void>;
  removeRecipient: (id: string) => Promise<void>;
  clearAllRecipients: () => Promise<void>;
  touchRecipient: (id: string) => Promise<void>;
  addActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'account'>) => void;
  clearActivity: () => void;
}

const CertoraContext = React.createContext<CertoraContextValue | null>(null);

export function useCertora() {
  const ctx = React.useContext(CertoraContext);
  if (!ctx) throw new Error('useCertora must be used within CertoraProvider');
  return ctx;
}

interface CertoraProviderProps {
  children: React.ReactNode;
}

export function CertoraProvider({ children }: CertoraProviderProps) {
  const [account, setAccountState] = React.useState<string | null>(null);
  const [network, setNetworkState] = React.useState<Nettype | null>(null);
  const [recipients, setRecipients] = React.useState<RecipientPin[]>([]);
  const [activity, setActivity] = React.useState<ActivityEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [initialized, setInitialized] = React.useState(false);

  const addActivity = React.useCallback(
    (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'account'>) => {
      const full: ActivityEvent = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        account: account ?? undefined,
        ...event,
      };
      setActivity((prev) => [full, ...prev].slice(0, 200));
    },
    [account],
  );

  const loadPins = React.useCallback(async (acct: string, net: Nettype) => {
    setLoading(true);
    setError(null);
    try {
      const pins = await getPins(acct, net);
      const valid = pins.filter(validatePin);
      setRecipients(valid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipients.');
    } finally {
      setLoading(false);
    }
  }, []);

  const setAccount = React.useCallback(
    async (acct: string | null, net: Nettype | null) => {
      setAccountState(acct);
      setNetworkState(net);
      if (acct && net) {
        await loadPins(acct, net);
      } else {
        setRecipients([]);
      }
      setInitialized(true);
    },
    [loadPins],
  );

  const addRecipient = React.useCallback(
    async (pin: Omit<RecipientPin, 'id' | 'account' | 'network'>) => {
      if (!account || !network) throw new Error('No account/network.');
      if (!initialized) {
        await new Promise<void>((resolve) => {
          const check = () => {
            if (initialized) resolve();
            else setTimeout(check, 10);
          };
          check();
        });
      }
      const full: RecipientPin = {
        id: crypto.randomUUID(),
        ...pin,
        account,
        network,
      };
      await savePin(full);
      setRecipients((prev) => [...prev, full]);
      addActivity({
        type: 'recipient_pinned',
        name: full.name,
        destination: full.destination,
      });
    },
    [account, network, initialized, addActivity],
  );

  /**
   * Replace an existing pin in place, preserving its id and creation context.
   * Used only after the user explicitly approves a new destination during a
   * recheck; no approval is ever performed automatically.
   */
  const updateRecipient = React.useCallback(
    async (id: string, pin: Omit<RecipientPin, 'id' | 'account' | 'network'>) => {
      if (!account || !network) throw new Error('No account/network.');
      const full: RecipientPin = {
        id,
        ...pin,
        account,
        network,
      };
      await savePin(full);
      setRecipients((prev) => prev.map((p) => (p.id === id ? full : p)));
    },
    [account, network],
  );

  const removeRecipient = React.useCallback(
    async (id: string) => {
      const pin = recipients.find((p) => p.id === id);
      await removePin(id);
      setRecipients((prev) => prev.filter((p) => p.id !== id));
      addActivity({
        type: 'recipient_removed',
        name: pin?.name,
        destination: pin?.destination,
      });
    },
    [recipients, addActivity],
  );

  const clearAllRecipients = React.useCallback(async () => {
    if (!account || !network) return;
    const count = await clearPins(account, network);
    setRecipients([]);
    addActivity({
      type: 'recipient_removed',
      metadata: { clearedCount: count },
    });
  }, [account, network, addActivity]);

  const touchRecipient = React.useCallback(async (id: string) => {
    await updateLastChecked(id);
    setRecipients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, lastCheckedAt: Date.now() } : p)),
    );
  }, []);

  const clearActivity = React.useCallback(() => {
    setActivity([]);
  }, []);

  const value: CertoraContextValue = {
    account,
    network,
    recipients,
    activity,
    loading,
    error,
    initialized,
    setAccount,
    addRecipient,
    updateRecipient,
    removeRecipient,
    clearAllRecipients,
    touchRecipient,
    addActivity,
    clearActivity,
  };

  return (
    <CertoraContext.Provider value={value}>{children}</CertoraContext.Provider>
  );
}
