import * as React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { ToastProvider } from './components/ui/Toast';
import { CertoraProvider, useCertora } from './state/CertoraProvider';
import { WalletProvider } from './state/WalletProvider';
import { useWallet } from './hooks/useWallet';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Overview } from './screens/Overview';
import { Resolve } from './screens/Resolve';
import { Recipients } from './screens/Recipients';
import { RecipientDetails } from './screens/RecipientDetails';
import { Activity } from './screens/Activity';
import { Settings } from './screens/Settings';
import { NotFound } from './screens/NotFound';

function AppBody() {
  const {
    connection,
    providerAvailable,
    connecting,
    connect,
    error,
    clearError,
  } = useWallet();
  const { setAccount, addActivity } = useCertora();

  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const address = connection?.address ?? null;
  const network = connection?.network ?? null;
  const connected = connection?.connected ?? false;

  const handleConnect = React.useCallback(async () => {
    try {
      await connect();
    } catch {
      // Error is surfaced through the shared wallet context.
    }
  }, [connect]);

  // The provider validates the network itself. Passing the raw wallet value
  // means an unknown or Mainnet network clears the active partition instead of
  // being silently coerced to Testnet.
  React.useEffect(() => {
    if (connected && address) {
      void setAccount(address, network);
    } else {
      void setAccount(null, null);
    }
  }, [connected, address, network, setAccount]);

  // Emit wallet lifecycle events exactly once per real transition.
  const previousWalletRef = React.useRef<{
    address: string | null;
    network: string | null;
    connected: boolean;
  } | null>(null);

  React.useEffect(() => {
    const previous = previousWalletRef.current;
    const current = {
      address,
      network,
      connected: connected && !!address,
    };

    if (previous) {
      if (current.connected && !previous.connected) {
        addActivity({
          type: 'wallet_connected',
          account: address ?? undefined,
          metadata: { network },
        });
      } else if (!current.connected && previous.connected) {
        addActivity({
          type: 'wallet_disconnected',
          account: previous.address ?? undefined,
        });
      } else if (current.connected) {
        if (previous.address !== current.address) {
          addActivity({
            type: 'account_changed',
            account: address ?? undefined,
            metadata: { previousAccount: previous.address },
          });
        }
        if (previous.network !== current.network) {
          addActivity({
            type: 'network_changed',
            account: address ?? undefined,
            metadata: { previousNetwork: previous.network, network: current.network },
          });
        }
      }
    }

    previousWalletRef.current = current;
  }, [address, network, connected, addActivity]);

  return (
    <div className="relative min-h-screen">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="bg-grid mask-radial absolute inset-0 opacity-[0.38]" />
        <div className="absolute -left-40 -top-56 h-[460px] w-[680px] rounded-full bg-gold/[0.045] blur-[120px]" />
        <div className="absolute -bottom-64 right-0 h-[420px] w-[620px] rounded-full bg-[#5B7CFF]/[0.03] blur-[130px]" />
      </div>

      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-gold px-4 py-2 text-sm font-medium text-[#191307] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative z-10 flex min-h-screen flex-col md:pl-[248px]">
        <Header
          connected={connected}
          address={address}
          network={network}
          providerAvailable={providerAvailable}
          connecting={connecting}
          onConnect={handleConnect}
          onMenu={() => setSidebarOpen(true)}
        />

        <main id="main" className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8 md:px-10 md:py-12">
          <Routes location={location}>
            <Route path="/" element={<Overview />} />
            <Route path="/resolve" element={<Resolve />} />
            <Route path="/recipients" element={<Recipients />} />
            <Route path="/recipients/:id" element={<RecipientDetails />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <footer className="border-t border-line/60 px-5 py-5 md:px-10">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-1.5 text-[10.5px] text-ash sm:flex-row sm:items-center sm:justify-between">
            <span>
              Certora is a local recipient-protection layer. It does not sign or send payments.
            </span>
            <span className="font-mono">Beldex Testnet · v0.1.0</span>
          </div>
        </footer>
      </div>

      {error && (
        <div className="fixed left-4 right-4 top-[76px] z-50 sm:left-auto sm:max-w-sm">
          <div className="flex items-start gap-3 rounded-xl border border-critical/25 bg-[#201211]/95 p-3.5 text-sm shadow-pop backdrop-blur-xl">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-chalk">Connection error</p>
              <p className="mt-0.5 break-words text-xs leading-relaxed text-smoke">{error}</p>
              <button
                onClick={clearError}
                className="mt-2 text-xs font-medium text-gold underline decoration-gold/40 underline-offset-2 hover:text-gold-soft"
              >
                Dismiss
              </button>
            </div>
            <button
              onClick={clearError}
              className="rounded-md p-1 text-ash hover:bg-white/[0.06] hover:text-chalk"
              aria-label="Dismiss connection error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <CertoraProvider>
        <WalletProvider>
          <AppBody />
        </WalletProvider>
      </CertoraProvider>
    </ToastProvider>
  );
}
