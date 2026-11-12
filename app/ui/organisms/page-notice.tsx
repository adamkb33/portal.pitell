import { CloudOff, FileSearch, RefreshCw } from 'lucide-react';
import { useRevalidator } from 'react-router';
import { Button } from '../atoms/button';
import { cn } from '../lib/cn';

export interface PageNoticeProps {
  /** `error`: the page's data could not be loaded, offers "Prøv igjen". `not-found`: the thing is gone, offers a link. */
  kind?: 'error' | 'not-found';
  /** What failed, e.g. "Kunne ikke hente varsler" or "Fant ikke timebestillingen". */
  title: string;
  /** One short line. Errors default to "Prøv igjen om litt."; never pass a raw error message. */
  message?: string;
  /** Not-found: the way back ("Til timebestillinger"). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Shown instead of a page's content when it can't be shown (approved sketch 2026-11-12): a centred card with an icon,
 * a title, one line and one way forward. "Prøv igjen" reloads the page's data in place (no full page reload).
 * For a short message inside a form or next to content, use `Notice`.
 */
export function PageNotice({ kind = 'error', title, message, action, className }: PageNoticeProps) {
  const revalidator = useRevalidator();
  const retrying = revalidator.state === 'loading';
  const isError = kind === 'error';
  const Icon = isError ? CloudOff : FileSearch;
  const line = message ?? (isError ? 'Prøv igjen om litt.' : undefined);

  return (
    <div
      role={isError ? 'alert' : undefined}
      className={cn(
        'flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-background px-6 py-10 text-center',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-14 items-center justify-center rounded-full',
          isError ? 'bg-amber-100 text-amber-900' : 'bg-blue-50 text-interactive',
        )}
      >
        <Icon className="size-7" aria-hidden />
      </span>
      <div className="grid gap-1">
        <p className="text-base font-semibold text-text-primary">{title}</p>
        {line ? <p className="max-w-xs text-sm text-text-secondary">{line}</p> : null}
      </div>
      {isError || action ? (
        <div className="flex flex-wrap justify-center gap-2">
          {isError ? (
            <Button type="button" variant="outline" disabled={retrying} onClick={() => revalidator.revalidate()}>
              <RefreshCw className={cn('size-4', retrying && 'animate-spin')} aria-hidden />
              {retrying ? 'Prøver igjen…' : 'Prøv igjen'}
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
