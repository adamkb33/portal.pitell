import { Link } from 'react-router';
import { Notice } from '../organisms/notice';
import { cn } from '../lib/cn';

export interface AuthPageTemplateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  aside?: React.ReactNode;
  topRight?: React.ReactNode;
  footer?: React.ReactNode;
  bottom?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
}

export function AuthPageTemplate({
  title,
  description,
  children,
  aside,
  topRight,
  footer,
  bottom,
  error,
  className,
}: AuthPageTemplateProps) {
  return (
    <div
      className={cn(
        'grid min-h-[calc(100vh-var(--app-header-height)-var(--app-footer-height))] lg:grid-cols-2',
        className,
      )}
    >
      <aside className="hidden min-h-full flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,var(--color-interactive),var(--color-blue-700))] p-10 text-text-inverse lg:flex">
        {aside ?? <DefaultAuthAside />}
      </aside>

      {/* Compact (design-language → Space and shape): the shell already pads the sides on phones, so no second gutter;
          the card sits near the top on phones instead of floating in the middle of the screen. */}
      <main className="flex min-h-full flex-col py-1 sm:px-4 lg:px-12 lg:py-6">
        <div className="flex items-center justify-between gap-4 text-sm">
          <Link to="/" className="text-text-secondary transition-colors hover:text-text-primary">
            Til forsiden
          </Link>
          {topRight ? <div className="text-right text-sm text-text-secondary">{topRight}</div> : null}
        </div>

        <div className="flex flex-1 items-start justify-center py-3 lg:items-center lg:py-8">
          <section className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-background p-4 shadow-[var(--shadow-card)] sm:p-6">
            <header className="mb-4 space-y-1">
              <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-text-primary">
                {title}
              </h1>
              {description ? <p className="text-sm leading-relaxed text-text-secondary">{description}</p> : null}
            </header>

            <div className="space-y-4">
              {error ? <Notice tone="emphasis" message={error} /> : null}
              {children}
            </div>

            {footer ? <footer className="mt-4 border-t border-border pt-4">{footer}</footer> : null}
          </section>
        </div>

        {bottom ? <div className="pb-2 text-center text-xs text-text-secondary">{bottom}</div> : null}
      </main>
    </div>
  );
}

function DefaultAuthAside() {
  return (
    <>
      <div className="inline-flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[var(--radius-control)] bg-white/14 text-lg font-bold shadow-[var(--shadow-card)]">
          P
        </span>
        <span>
          <span className="block font-display text-lg font-bold leading-none">Pitell</span>
          <span className="block pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">Portal</span>
        </span>
      </div>

      <div className="max-w-xl space-y-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/65">Pitell · arbeidsflate</span>
        <h2 className="font-display text-4xl font-bold leading-tight tracking-tight">
          Drift selskap, booking og varsler fra ett sted.
        </h2>
        <p className="max-w-md text-base leading-relaxed text-white/78">
          En ryddig portal for administrasjon, kundeflyt og daglige operasjoner.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/16 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
        <span>© 2026</span>
        <span>Pitell portal</span>
      </div>
    </>
  );
}
