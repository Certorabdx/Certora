interface LoadingProps {
  message?: string;
}

export function Loading({ message }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <span className="relative flex h-9 w-9 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-gold/20" />
        <span className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-gold" />
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
      </span>
      {message && <p className="text-[13px] text-smoke">{message}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-white/[0.045] ${className ?? 'h-4 w-full'}`}
    >
      <div className="absolute inset-y-0 w-1/2 animate-sweep bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}
