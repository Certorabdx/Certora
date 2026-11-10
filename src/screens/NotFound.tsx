import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-line-strong bg-raised text-gold">
        <Compass className="h-6 w-6" />
      </div>
      <p className="eyebrow mb-2">404</p>
      <h1 className="display text-4xl text-chalk">This page isn’t pinned.</h1>
      <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-smoke">
        The route you followed doesn’t exist. Return to the overview to continue protecting
        your recipients.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-[10px] border border-transparent bg-gold px-4 text-[13.5px] font-medium text-[#191307] shadow-gold-inset transition-colors hover:bg-gold-soft"
      >
        Back to overview
      </Link>
    </div>
  );
}
