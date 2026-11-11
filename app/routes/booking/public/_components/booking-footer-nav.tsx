import * as React from 'react';
import { cn } from '~/ui';

export interface BookingFooterNavProps extends React.HTMLAttributes<HTMLElement> {
  /** "Tilbake" to the previous step (left out on the first step), then the step's main action. */
  children: React.ReactNode;
  /** CSS selector for the page footer the nav should avoid overlapping. */
  avoidSelector?: string;
  /** Optional message strip above the buttons — stays visible since the nav is fixed. */
  message?: React.ReactNode;
}

const BASE_OFFSET_PX = 12; // matches inset-x-3 / 0.75rem

export function BookingFooterNav({
  children,
  className,
  avoidSelector = 'footer',
  message,
  ...props
}: BookingFooterNavProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [spacerHeight, setSpacerHeight] = React.useState<number | null>(null);
  const [bottomOffset, setBottomOffset] = React.useState<number | null>(null);
  const [ready, setReady] = React.useState(false); // measurements settled
  const [entered, setEntered] = React.useState(false); // entrance animation target

  const measured = spacerHeight !== null && bottomOffset !== null;

  // Spacer: reserve room in the document flow equal to the floating nav.
  React.useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      const h = el.offsetHeight;
      if (h > 0) setSpacerHeight(h);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Lift the nav by however much of the footer is visible in the viewport.
  React.useLayoutEffect(() => {
    const footer = document.querySelector<HTMLElement>(avoidSelector);
    if (!footer) {
      setBottomOffset(BASE_OFFSET_PX);
      return;
    }

    const update = () => {
      const rect = footer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const visibleFooterHeight = Math.max(0, viewportHeight - rect.top);
      setBottomOffset(BASE_OFFSET_PX + visibleFooterHeight);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    // The footer moves when the page above it grows (e.g. times appearing), so watch the page too.
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    observer.observe(document.body);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, [avoidSelector]);

  // Phase 1: wait two frames after measurements land so layout settles.
  React.useEffect(() => {
    if (!measured || ready) return;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [measured, ready]);

  // Phase 2: paint one frame in the "from" state, then animate to "entered".
  React.useEffect(() => {
    if (!ready || entered) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [ready, entered]);

  return (
    <div style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }} className="md:!pb-0">
      <div style={{ height: spacerHeight ?? 0 }}>
        <div
          ref={wrapperRef}
          data-floating-action-bar
          style={{
            bottom: `max(${bottomOffset ?? BASE_OFFSET_PX}px, env(safe-area-inset-bottom))`,
          }}
          className={cn(
            'fixed inset-x-3 z-40 mx-auto max-w-md md:static md:max-w-5xl',
            !ready && 'invisible opacity-0',
            ready && !entered && 'visible translate-y-4 opacity-0',
            entered &&
              'visible translate-y-0 opacity-100 transition-[bottom,opacity,transform] duration-300 ease-out motion-reduce:transition-none',
          )}
        >
          <div
            className={cn(message && 'rounded-[var(--radius-booking-panel)] shadow-[var(--shadow-booking-floating)]')}
          >
            {message && (
              <div className="rounded-t-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-b-0 border-booking-border bg-booking-action-muted px-3 py-2 text-center text-sm font-normal">
                {message}
              </div>
            )}
            <nav
              aria-label="Booking handlinger"
              className={cn(
                'border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised p-2 md:p-2',
                message
                  ? 'rounded-b-[var(--radius-booking-panel)] rounded-t-none shadow-none'
                  : 'rounded-[var(--radius-booking-panel)] shadow-[var(--shadow-booking-floating)]',
                className,
              )}
              {...props}
            >
              <div className="grid w-full auto-cols-fr grid-flow-col gap-2">{children}</div>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
