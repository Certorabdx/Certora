import { Link } from 'react-router-dom';
import { LogoMark } from './LogoMark';

interface LogoProps {
  compact?: boolean;
  to?: string;
}

export function Logo({ compact = false, to = '/' }: LogoProps) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
      aria-label="Certora home"
    >
      <LogoMark className="h-9 w-9 shrink-0 drop-shadow-[0_6px_16px_rgba(231,179,106,0.22)] transition-transform duration-300 group-hover:-rotate-3" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15.5px] font-semibold tracking-[-0.03em] text-chalk">
            Certora
          </span>
          <span className="mt-1.5 text-[8px] font-medium uppercase tracking-[0.24em] text-ash">
            BNS protection
          </span>
        </span>
      )}
    </Link>
  );
}
