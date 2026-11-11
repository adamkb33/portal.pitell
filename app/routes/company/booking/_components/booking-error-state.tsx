import { CloudOff, RefreshCw } from 'lucide-react';
import { useRevalidator } from 'react-router';
import { Button } from '~/ui';

/** Shown instead of a page's content when its data could not be loaded. The wording is deliberately vague. */
export function BookingErrorState({ className = '' }: { className?: string }) {
  const revalidator = useRevalidator();
  const loading = revalidator.state === 'loading';

  return (
    <div
      role="alert"
      className={`flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-background px-6 py-12 text-center ${className}`}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-900">
        <CloudOff className="size-7" aria-hidden />
      </span>
      <div className="grid gap-1">
        <p className="text-base font-semibold text-text-primary">Det er problemer akkurat nå</p>
        <p className="max-w-xs text-sm text-text-secondary">Vi kunne ikke laste dette. Prøv igjen om litt.</p>
      </div>
      <Button type="button" variant="outline" disabled={loading} onClick={() => revalidator.revalidate()}>
        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden /> Prøv igjen
      </Button>
    </div>
  );
}
