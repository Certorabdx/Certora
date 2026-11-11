import * as React from 'react';
import {
  getPins,
  savePin,
  removePin,
  clearPins,
  updateLastChecked,
  validatePin,
  isSupportedNetwork,
  type RecipientPin,
  type ActivityEvent,
  type Nettype,
} from '@certora/core';

interface CertoraContextValue {
  account: string | null;
  network: Nettype | null;
  recipients: RecipientPin[];
  activity: ActivityEvent[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setAccount: (account: string | null, network: unknown) => Promise<void>;
  addRecipient: (pin: Omit<RecipientPin, 'id' | 'account' | 'network'>) => Promise<void>;
  updateRecipient: (
    id: string,
    pin: Omit<RecipientPin, 'id' | 'account' | 'network'>,
  ) => Promise<void>;
  removeRecipient: (id: string) => Promise<void>;
  clearAllRecipients: () => Promise<void>;
  touchRecipient: (id: string) => Promise<void>;
  addActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
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

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function createDeferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export function CertoraProvider({ children }: CertoraProviderProps) {
  const [account, setAccountState] = React.useState<string | null>(null);
  const [network, setNetworkState] = React.useState<Nettype | null>(null);
  const [recipients, setRecipients] = React.useState<RecipientPin[]>([]);
  const [activity, setActivity] = React.useState<ActivityEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [initialized, setInitialized] = React.useState(false);

  // Refs mirror the active partition synchronously so async operations can
  // verify that the wallet has not changed underneath them.
  const accountRef = React.useRef<string | null>(null);
  const networkRef = React.useRef<Nettype | null>(null);
  const accountVersionRef = React.useRef(0);
  const readyRef = React.useRef<Deferred | null>(null);

  const addActivity = React.useCallback(
    (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
      const full: ActivityEvent = {
        ...event,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        account: event.account ?? accountRef.current ?? undefined,
      };
      setActivity((prev) => [full, ...prev].slice(0, 200));
    },
    [],
  );

  const setAccount = React.useCallback(async (acct: string | null, net: unknown) => {
    const version = accountVersionRef.current + 1;
    accountVersionRef.current = version;

    // Release anyone waiting on the previous partition before replacing it.
    readyRef.current?.resolve();

    const supportedAccount =
      typeof acct === 'string' && acct.length > 0 && isSupportedNetwork(net) ? acct : null;
    const supportedNetwork: Nettype | null = supportedAccount ? 'testnet' : null;

    accountRef.current = supportedAccount;
    networkRef.current = supportedNetwork;
    setAccountState(supportedAccount);
    setNetworkState(supportedNetwork);

    if (!supportedAccount || !supportedNetwork) {
      setRecipients([]);
      setLoading(false);
      setError(null);
      setInitialized(true);
      const ready = createDeferred();
      ready.resolve();
      readyRef.current = ready;
      return;
    }

    const ready = createDeferred();
    readyRef.current = ready;
    setLoading(true);
    setError(null);
    setInitialized(false);

    try {
      const pins = await getPins(supportedAccount, supportedNetwork);
      if (accountVersionRef.current !== version) {
        return;
      }
      setRecipients(pins.filter(validatePin));
    } catch (err) {
      if (accountVersionRef.current !== version) {
        return;
      }
      setRecipients([]);
      setError(err instanceof Error ? err.message : 'Failed to load recipients.');
    } finally {
      if (accountVersionRef.current === version) {
        setLoading(false);
        setInitialized(true);
      }
      ready.resolve();
    }
  }, []);

  const addRecipient = React.useCallback(
    async (pin: Omit<RecipientPin, 'id' | 'account' | 'network'>) => {
      const targetAccount = accountRef.current;
      const targetNetwork = networkRef.current;
      if (!targetAccount || targetNetwork !== 'testnet') {
        throw new Error('No Testnet account is connected.');
      }

      // Wait for the active partition to finish loading, then re-check that
      // the wallet did not change while we waited.
      if (!initialized) {
        await readyRef.current?.promise;
      }
      if (accountRef.current !== targetAccount || networkRef.current !== targetNetwork) {
        throw new Error('The wallet account or network changed. Please try again.');
      }

      if (
        recipients.some(
          (existing) =>
            existing.network === targetNetwork &&
            existing.name.trim().toLowerCase() === pin.name.trim().toLowerCase(),
        )
      ) {
        throw new Error(
          `A recipient named "${pin.name}" is already pinned for this account and network.`,
        );
      }

      const full: RecipientPin = {
        ...pin,
        id: crypto.randomUUID(),
        account: targetAccount,
        network: targetNetwork,
      };
      await savePin(full);

      if (accountRef.current !== targetAccount || networkRef.current !== targetNetwork) {
        return;
      }

      setRecipients((prev) =>
        prev.some((existing) => existing.id === full.id) ? prev : [...prev, full],
      );
      addActivity({
        type: 'recipient_pinned',
        name: full.name,
        destination: full.destination,
      });
    },
    [initialized, recipients, addActivity],
  );

  /**
   * Replace an existing pin's destination in place, preserving its id and
   * identity. Used only after explicit user approval during a recheck.
   * Changing the name or mapping type is not a destination reapproval and must
   * use remove + fresh resolve + pin instead.
   */
  const updateRecipient = React.useCallback(
    async (id: string, pin: Omit<RecipientPin, 'id' | 'account' | 'network'>) => {
      const targetAccount = accountRef.current;
      const targetNetwork = networkRef.current;
      if (!targetAccount || targetNetwork !== 'testnet') {
        throw new Error('No Testnet account is connected.');
      }

      const existing = recipients.find((recipient) => recipient.id === id);
      if (
        !existing ||
        existing.account !== targetAccount ||
        existing.network !== targetNetwork
      ) {
        throw new Error('This recipient does not belong to the active account.');
      }

      if (
        existing.name.trim().toLowerCase() !== pin.name.trim().toLowerCase() ||
        existing.mappingType !== pin.mappingType
      ) {
        throw new Error(
          'A destination approval cannot change the pinned name or mapping type.',
        );
      }

      const full: RecipientPin = {
        ...pin,
        id,
        account: targetAccount,
        network: targetNetwork,
      };
      await savePin(full);

      if (accountRef.current !== targetAccount || networkRef.current !== targetNetwork) {
        return;
      }

      setRecipients((prev) => prev.map((recipient) => (recipient.id === id ? full : recipient)));
    },
    [recipients],
  );

  const removeRecipient = React.useCallback(
    async (id: string) => {
      const targetAccount = accountRef.current;
      const targetNetwork = networkRef.current;
      const pin = recipients.find((recipient) => recipient.id === id);

      if (
        !pin ||
        !targetAccount ||
        pin.account !== targetAccount ||
        pin.network !== targetNetwork
      ) {
        throw new Error('This recipient does not belong to the active account.');
      }

      await removePin(id);
      setRecipients((prev) => prev.filter((recipient) => recipient.id !== id));
      addActivity({
        type: 'recipient_removed',
        name: pin.name,
        destination: pin.destination,
      });
    },
    [recipients, addActivity],
  );

  const clearAllRecipients = React.useCallback(async () => {
    const targetAccount = accountRef.current;
    const targetNetwork = networkRef.current;
    if (!targetAccount || targetNetwork !== 'testnet') return;

    const count = await clearPins(targetAccount, targetNetwork);

    if (accountRef.current === targetAccount && networkRef.current === targetNetwork) {
      setRecipients([]);
    }
    addActivity({
      type: 'recipient_removed',
      account: targetAccount,
      metadata: { clearedCount: count },
    });
  }, [addActivity]);

  const touchRecipient = React.useCallback(async (id: string) => {
    await updateLastChecked(id);
    setRecipients((prev) =>
      prev.map((pin) => (pin.id === id ? { ...pin, lastCheckedAt: Date.now() } : pin)),
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

  return <CertoraContext.Provider value={value}>{children}</CertoraContext.Provider>;
}
