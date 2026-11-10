import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

function useDialogBehavior(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    const focusTimer = window.setTimeout(() => {
      focusables()[0]?.focus();
    }, 30);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return panelRef;
}

const panelClasses =
  'fixed left-1/2 top-1/2 z-[70] max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line-strong bg-[#11151B] p-6 shadow-pop animate-scale-in';

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const panelRef = useDialogBehavior(open, onClose);
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={panelClasses}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Dialog'}
      >
        {title && (
          <h2 className="mb-4 pr-8 text-[17px] font-medium tracking-[-0.01em] text-chalk">{title}</h2>
        )}
        <div className="space-y-4">{children}</div>
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-ash transition-colors hover:bg-white/[0.06] hover:text-chalk"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  busy = false,
}: ConfirmDialogProps) {
  const panelRef = useDialogBehavior(open, onCancel);
  if (!open) return null;

  const Icon = variant === 'danger' ? AlertTriangle : ShieldCheck;

  return (
    <>
      <div
        className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-[3px]"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={panelClasses}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start gap-3.5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              variant === 'danger'
                ? 'border-critical/25 bg-critical/[0.09] text-critical'
                : 'border-gold/25 bg-gold/[0.09] text-gold'
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-[17px] font-medium tracking-[-0.01em] text-chalk">{title}</h2>
            <div className="mt-2 text-[13px] leading-relaxed text-smoke">{description}</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'dangerSolid' : 'primary'}
            onClick={onConfirm}
            isLoading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
