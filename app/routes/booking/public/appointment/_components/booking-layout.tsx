import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Form, useLocation } from 'react-router';
import { AlertCircle, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiMessage } from '~/api/generated/identity';

/* ========================================
   BOOKING PAGE HEADER
   Mobile-first page title component
   ======================================== */

interface BookingPageHeaderProps {
  label?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  className?: string;
}

export function BookingPageHeader({ label, title, description, meta, className }: BookingPageHeaderProps) {
  return (
    <header className={cn('pb-3 md:border-b md:border-border md:pb-4', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        {/* Title content */}
        <div className="flex-1 space-y-2 md:space-y-2.5">
          {label && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground md:text-sm">{label}</p>
          )}

          <h1 className="text-xl font-bold text-foreground md:text-2xl lg:text-3xl">{title}</h1>

          {description && <p className="text-sm text-muted-foreground md:text-base">{description}</p>}
        </div>

        {/* Meta content */}
        {meta && <div className="shrink-0">{meta}</div>}
      </div>
    </header>
  );
}

/* ========================================
  BOOKING STEP HEADER
  Consistent header across wizard steps
  ======================================== */

interface BookingStepHeaderProps {
  label?: string;
  title: string;
  description?: string;
  status?: ReactNode;
  className?: string;
}

export function BookingStepHeader({ label, title, description, status, className }: BookingStepHeaderProps) {
  return (
    <BookingPageHeader label={label} title={title} description={description} meta={status} className={className} />
  );
}

/* ========================================
  BOOKING ERROR BANNER
  Standard error presentation
  ======================================== */

interface BookingErrorBannerProps {
  message?: ApiMessage | string;
  title?: string;
  sticky?: boolean;
  className?: string;
}

export function BookingErrorBanner({
  message,
  title = 'Noe gikk galt',
  sticky = false,
  className,
}: BookingErrorBannerProps) {
  return (
    <div
      className={cn(
        'border-b border-destructive/20 bg-destructive/10 md:rounded-lg md:border md:border-destructive/20',
        sticky && 'sticky top-0 z-10 md:relative',
        className,
      )}
    >
      <div className="flex items-start gap-3 p-3 md:p-4">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive md:text-base">{title}</p>
          {message && (
            <p className="mt-1 text-xs text-destructive/90 md:text-sm">
              {typeof message === 'string' ? message : message.value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================
   BOOKING SECTION
   Card-style content container
   ======================================== */

interface BookingSectionProps {
  label?: string;
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'muted' | 'elevated';
}

export function BookingSection({ label, title, children, className, variant = 'default' }: BookingSectionProps) {
  return (
    <section
      className={cn(
        // Base styles - mobile-first padding
        'rounded-lg border p-3 md:p-4 lg:p-5',

        // Variant backgrounds
        variant === 'default' && 'border-card-border bg-card',
        variant === 'muted' && 'border-card-muted-border bg-card-muted-bg',
        variant === 'elevated' && 'border-card-elevated-border bg-card-elevated-bg shadow-sm',

        className,
      )}
    >
      {/* Section header */}
      {(label || title) && (
        <div className="mb-3 space-y-1.5 md:mb-4">
          {label && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground md:text-sm">{label}</p>
          )}

          {title && <h2 className="text-base font-bold text-card-text md:text-lg">{title}</h2>}
        </div>
      )}

      {/* Content */}
      <div className="space-y-3 md:space-y-4">{children}</div>
    </section>
  );
}

/* ========================================
   BOOKING CONTAINER
   Main layout wrapper
   ======================================== */

interface BookingContainerProps {
  children: ReactNode;
  className?: string;
}

export function BookingContainer({ children, className }: BookingContainerProps) {
  return (
    <div
      className={cn(
        // Mobile: Tight spacing, no margin
        // Desktop: More breathing room
        'mx-auto w-full max-w-4xl space-y-4 md:space-y-5 lg:space-y-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ========================================
   BOOKING GRID
   Responsive grid layout
   ======================================== */

interface BookingGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function BookingGrid({ children, cols = 2, className }: BookingGridProps) {
  return (
    <div
      className={cn(
        'grid gap-3 md:gap-4 lg:gap-5',

        // Mobile-first column definitions
        cols === 1 && 'grid-cols-1',
        cols === 2 && 'grid-cols-1 md:grid-cols-2',
        cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',

        className,
      )}
    >
      {children}
    </div>
  );
}

/* ========================================
   BOOKING META
   Definition list for key-value pairs
   ======================================== */

interface BookingMetaProps {
  items: Array<{ label: string; value: ReactNode; icon?: ReactNode }>;
  layout?: 'stacked' | 'inline' | 'compact';
  className?: string;
}

export function BookingMeta({ items, layout = 'inline', className }: BookingMetaProps) {
  if (layout === 'compact') {
    // Compact: Side-by-side labels and values
    return (
      <dl className={cn('space-y-2', className)}>
        {items.map((item, index) => (
          <div key={index} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {item.icon && <dt className="shrink-0 text-muted-foreground">{item.icon}</dt>}
            <dt className="text-xs font-medium text-muted-foreground">{item.label}:</dt>
            <dd className="text-sm font-medium text-card-text md:text-base">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (layout === 'stacked') {
    // Stacked: Label above value
    return (
      <dl className={cn('space-y-3 md:space-y-4', className)}>
        {items.map((item, index) => (
          <div key={index}>
            <dt className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {item.icon}
              {item.label}
            </dt>
            <dd className="text-sm font-semibold text-card-text md:text-base">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  // Inline: Grid layout with aligned columns
  return (
    <dl className={cn('grid gap-2 md:gap-3', className)}>
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-[auto_1fr] items-baseline gap-x-3">
          <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground md:text-sm">
            {item.icon}
            {item.label}
          </dt>
          <dd className="text-sm font-medium text-card-text md:text-base">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ========================================
   BOOKING STEP LIST
   Ordered list with step numbers
   ======================================== */

interface BookingStepListProps {
  steps: Array<{
    title: string;
    description?: string;
    icon?: ReactNode;
  }>;
  className?: string;
}

export function BookingStepList({ steps, className }: BookingStepListProps) {
  return (
    <ol className={cn('space-y-3 md:space-y-4', className)}>
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3 md:gap-4">
          {/* Step number */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground md:size-10">
            {step.icon || <span className="text-sm font-bold md:text-base">{index + 1}</span>}
          </div>

          {/* Step content */}
          <div className="flex-1 space-y-1 pt-0.5">
            <h3 className="text-sm font-semibold text-card-text md:text-base">{step.title}</h3>

            {step.description && <p className="text-xs text-muted-foreground md:text-sm">{step.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ========================================
   BOOKING BUTTON
   Mobile-first button component
   ======================================== */

interface BookingButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
}

export function BookingButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  form,
}: BookingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      form={form}
      className={cn(
        // Base styles - always touch-friendly
        'inline-flex items-center justify-center gap-2',
        'rounded-lg font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',

        // Size variants - all meet 44px minimum on mobile
        size === 'sm' && 'h-10 px-4 text-sm md:h-9 md:px-3 md:text-xs',
        size === 'md' && 'h-12 px-6 text-base md:h-11 md:px-5 md:text-sm',
        size === 'lg' && 'h-14 px-8 text-lg md:h-12 md:px-7 md:text-base',

        // Variant styles
        variant === 'primary' && [
          'bg-button-primary-bg text-button-primary-text',
          'border-2 border-button-primary-border',
          'hover:bg-button-primary-hover-bg',
          'active:bg-button-primary-active-bg',
          'focus-visible:ring-button-primary-ring',
        ],

        variant === 'secondary' && [
          'bg-button-secondary-bg text-button-secondary-text',
          'border-2 border-button-secondary-border',
          'hover:bg-button-secondary-hover-bg',
          'active:bg-button-secondary-active-bg',
          'focus-visible:ring-button-secondary-ring',
        ],

        variant === 'outline' && [
          'bg-button-outline-bg text-button-outline-text',
          'border-2 border-button-outline-border',
          'hover:bg-button-outline-hover-bg',
          'active:bg-button-outline-active-bg',
          'focus-visible:ring-button-outline-ring',
        ],

        variant === 'ghost' && [
          'bg-button-ghost-bg text-button-ghost-text',
          'border-2 border-button-ghost-border',
          'hover:bg-button-ghost-hover-bg',
          'active:bg-button-ghost-active-bg',
          'focus-visible:ring-button-ghost-ring',
        ],

        variant === 'destructive' && [
          'bg-button-destructive-bg text-button-destructive-text',
          'border-2 border-button-destructive-border',
          'hover:bg-button-destructive-hover-bg',
          'active:bg-button-destructive-active-bg',
          'focus-visible:ring-button-destructive-ring',
        ],

        // Disabled state
        isDisabled && [
          'cursor-not-allowed opacity-60',
          'bg-button-disabled-bg text-button-disabled-text',
          'border-button-disabled-border',
        ],

        // Full width
        fullWidth && 'w-full',

        className,
      )}
      aria-busy={loading}
    >
      {loading && (
        <svg
          className="size-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

/* ========================================
   BOOKING CARD
   Clickable/selectable card component
   ======================================== */

interface BookingCardProps {
  children: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function BookingCard({ children, selected = false, disabled = false, onClick, className }: BookingCardProps) {
  const isInteractive = !!onClick && !disabled;

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        // Base styles
        'rounded-lg border-2 p-3 transition-all md:p-4',

        // Interactive states
        isInteractive && [
          'cursor-pointer',
          'hover:border-card-interactive-hover-border',
          'hover:bg-card-interactive-hover-bg',
          'active:bg-card-interactive-active-bg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-card-interactive-ring',
        ],

        // Selected state
        selected && ['border-primary bg-primary/5', 'shadow-sm'],

        // Default state
        !selected && 'border-card-border bg-card',

        // Disabled state
        disabled && 'cursor-not-allowed opacity-50',

        className,
      )}
    >
      {children}
    </div>
  );
}

/* ========================================
  SELECTABLE CARD
  Accessible, interactive card base
  ======================================== */

interface SelectableCardProps {
  children: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export function SelectableCard({
  children,
  selected = false,
  disabled = false,
  onClick,
  className,
  ariaLabel,
}: SelectableCardProps) {
  const isInteractive = !!onClick && !disabled;

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-selected={isInteractive ? selected : undefined}
      aria-label={ariaLabel}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-lg border-2 p-3 transition-all md:p-4',
        isInteractive && [
          'cursor-pointer',
          'hover:border-card-interactive-hover-border',
          'hover:bg-card-interactive-hover-bg',
          'active:bg-card-interactive-active-bg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-card-interactive-ring',
        ],
        selected && ['border-primary bg-primary/5', 'shadow-sm'],
        !selected && 'border-card-border bg-card',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ========================================
  COLLAPSIBLE CARD
  ======================================== */

interface CollapsibleCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  editLink?: string;
  badge?: ReactNode;
  className?: string;
}

export function CollapsibleCard({
  title,
  icon,
  children,
  defaultOpen = true,
  editLink,
  badge,
  className,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <BookingCard className={cn('overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 transition-colors hover:bg-card-hover-bg"
      >
        <div className="flex flex-1 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">{icon}</div>
          <div className="flex-1 text-left">
            <h3 className="text-base font-bold text-card-text md:text-lg">{title}</h3>
          </div>
          {badge}
        </div>

        <div className="flex items-center gap-2">
          {editLink && (
            <Form method="get" action={editLink} onClick={(e) => e.stopPropagation()}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-card-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted md:text-sm"
              >
                <Edit3 className="size-3 md:size-3.5" />
                <span className="hidden sm:inline">Endre</span>
              </button>
            </Form>
          )}

          {isOpen ? (
            <ChevronUp className="size-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && <div className="border-t border-card-border pt-3 md:pt-4">{children}</div>}
    </BookingCard>
  );
}

/* ========================================
   BOOKING BOTTOM NAV
   Fixed mobile summary + actions
   ======================================== */

export interface BookingBottomNavProps {
  title?: string;
  items: Array<{ label: string; value: ReactNode; icon?: ReactNode }>;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  primaryActionClassName?: string;
  className?: string;
}

export function BookingBottomNav({
  title,
  items,
  primaryAction,
  secondaryAction,
  primaryActionClassName,
  className,
}: BookingBottomNavProps) {
  const [isMounted, setIsMounted] = useState(false);
  const mountNode = typeof document === 'undefined' ? null : document.getElementById('booking-mobile-footer');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    const isKeyboardInput = (elem: HTMLElement) => {
      if (elem.tagName === 'INPUT') {
        const type = (elem as HTMLInputElement).type;
        return !['button', 'submit', 'checkbox', 'radio', 'file', 'image'].includes(type);
      }
      return elem.tagName === 'TEXTAREA' || elem.hasAttribute('contenteditable');
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (!e.target) return;
      const target = e.target as HTMLElement;
      if (isKeyboardInput(target)) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      if (!e.target) return;
      const target = e.target as HTMLElement;
      if (isKeyboardInput(target)) {
        setTimeout(() => setIsKeyboardOpen(false), 100);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  if (!isMounted || !mountNode) return null;

  return createPortal(
    <div
      className={cn(
        'border-t border-card-border bg-background shadow-2xl',
        'pb-[env(safe-area-inset-bottom)]',
        'w-full',
        isKeyboardOpen && 'hidden',
        className,
      )}
    >
      <div className="space-y-2 p-3">
        {title && <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>}
        <dl className="space-y-1">
          {items.map((item, index) => (
            <div key={index} className="flex items-baseline gap-2">
              {item.icon && <dt className="shrink-0 text-muted-foreground">{item.icon}</dt>}
              <dt className="text-xs font-medium text-muted-foreground">{item.label}:</dt>
              <dd className="text-base font-semibold text-card-text">{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-1.5">
          <div
            className={cn(
              'w-full',
              primaryActionClassName ??
                '[&_button]:bg-secondary [&_button]:text-secondary-foreground [&_button]:border-secondary/40 [&_button:hover]:bg-secondary/90',
            )}
          >
            {primaryAction}
          </div>
          {secondaryAction && <span className="w-full">{secondaryAction}</span>}
        </div>
      </div>
    </div>,
    mountNode,
  );
}

/* ========================================
  SCROLL HINT
  Subtle indicator for more content
  ======================================== */

interface BookingScrollHintProps {
  containerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

export function BookingScrollHint({ containerRef, className }: BookingScrollHintProps) {
  const hintRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [bottomOffset, setBottomOffset] = useState<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    setIsVisible(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById('booking-mobile-footer');
    if (!target) {
      setBottomOffset(null);
      return;
    }

    const updateOffset = () => {
      const rect = target.getBoundingClientRect();
      setBottomOffset(rect.height);
    };

    updateOffset();

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateOffset) : null;
    if (resizeObserver) {
      resizeObserver.observe(target);
    }

    return () => {
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    const resolveScrollTarget = () => {
      if (containerRef?.current) return containerRef.current;

      let node = hintRef.current?.parentElement ?? null;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        const isScrollable = overflowY === 'auto' || overflowY === 'scroll';
        if (isScrollable && node.scrollHeight > node.clientHeight) {
          return node;
        }
        node = node.parentElement;
      }

      return document.documentElement;
    };

    const updateVisibility = () => {
      const target = resolveScrollTarget();
      if (!target) return;

      const scrollTop = target.scrollTop ?? 0;
      const clientHeight = target.clientHeight ?? 0;
      const scrollHeight = target.scrollHeight ?? 0;
      const hasOverflow = scrollHeight - clientHeight > 4;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 4;

      setIsVisible(hasOverflow && !atBottom);
    };

    const target = resolveScrollTarget();
    const onScroll = () => updateVisibility();

    updateVisibility();

    if (target && target !== document.documentElement) {
      target.addEventListener('scroll', onScroll, { passive: true });
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    window.addEventListener('resize', onScroll);

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateVisibility) : null;
    if (resizeObserver && target && target !== document.documentElement) {
      resizeObserver.observe(target);
    }

    return () => {
      if (target && target !== document.documentElement) {
        target.removeEventListener('scroll', onScroll);
      } else {
        window.removeEventListener('scroll', onScroll);
      }
      window.removeEventListener('resize', onScroll);
      resizeObserver?.disconnect();
    };
  }, [containerRef, location.pathname, location.search]);

  return (
    <div
      ref={hintRef}
      aria-hidden="true"
      className={cn(
        'absolute left-1/2 z-30 -translate-x-1/2 rounded-full border shadow-sm',
        'flex items-center justify-center',
        'transition-opacity duration-200',
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
        'size-10 border-primary/20 bg-primary/60 text-secondary-foreground',
        className,
      )}
      style={
        bottomOffset === null
          ? {
              bottom: '1rem',
            }
          : {
              bottom: `${bottomOffset + 16}px`,
            }
      }
    >
      <ChevronDown className="size-5" />
    </div>
  );
}

/* ========================================
  BOOKING SUMMARY
  Shared mobile sticky + desktop summary
  ======================================== */

interface BookingSummaryProps {
  show?: boolean;
  mobile?: BookingBottomNavProps;
  desktop?: ReactNode;
  desktopClassName?: string;
}

export function BookingSummary({ show = true, mobile, desktop, desktopClassName }: BookingSummaryProps) {
  if (!show) return null;

  return (
    <>
      {mobile && <BookingBottomNav {...mobile} />}
      {desktop && <div className={cn('hidden md:block', desktopClassName)}>{desktop}</div>}
    </>
  );
}
