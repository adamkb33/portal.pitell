import * as React from 'react';
import { cn } from '@/lib/utils';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type LogoVariant = 'default' | 'stacked' | 'compact' | 'wordmark' | 'symbol';

export interface PTLLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: LogoSize;
  variant?: LogoVariant;
  animated?: boolean;
  onDark?: boolean;
}

const sizeMap: Record<LogoSize, { icon: string; wordmark: string; tagline: string; gap: string; frame: string }> = {
  xs: { icon: 'h-5 w-5', wordmark: 'text-sm', tagline: 'text-[9px]', gap: 'gap-1.5', frame: 'rounded-md p-1' },
  sm: { icon: 'h-6 w-6', wordmark: 'text-base', tagline: 'text-[10px]', gap: 'gap-2', frame: 'rounded-lg p-1.5' },
  md: { icon: 'h-7 w-7', wordmark: 'text-lg', tagline: 'text-[11px]', gap: 'gap-2.5', frame: 'rounded-lg p-1.5' },
  lg: { icon: 'h-9 w-9', wordmark: 'text-2xl', tagline: 'text-xs', gap: 'gap-3', frame: 'rounded-xl p-2' },
  xl: { icon: 'h-11 w-11', wordmark: 'text-3xl', tagline: 'text-xs', gap: 'gap-3.5', frame: 'rounded-xl p-2.5' },
  '2xl': { icon: 'h-14 w-14', wordmark: 'text-5xl', tagline: 'text-sm', gap: 'gap-4', frame: 'rounded-2xl p-3' },
};

function getTone(onDark: boolean) {
  return onDark
    ? {
        // On the navy chrome (sidebar, phone menu).
        frame: 'border-chrome-border bg-chrome-raised/60',
        svgFrame: 'fill-chrome-raised/60 stroke-chrome-border',
        primary: 'text-chrome-text',
        secondary: 'text-chrome-text',
        tertiary: 'text-chrome-text-muted',
        node: 'fill-chrome-accent',
        rail: 'stroke-chrome-accent',
        chip: 'bg-chrome-accent',
      }
    : {
        frame: 'border-border bg-surface',
        svgFrame: 'fill-surface stroke-border',
        primary: 'text-text-primary',
        secondary: 'text-primary',
        tertiary: 'text-text-secondary',
        node: 'fill-accent',
        rail: 'stroke-primary',
        chip: 'bg-surface',
      };
}

function PitellSymbol({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const tone = getTone(onDark);

  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn('overflow-visible', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" className={cn('stroke-[1.5]', tone.svgFrame)} />
      <path
        d="M13 29.5V10.5H22.25C26.2 10.5 28.75 12.86 28.75 16.37C28.75 19.92 26.2 22.2 22.25 22.2H17.75"
        className={cn('stroke-[2.4] stroke-linecap-round stroke-linejoin-round', tone.primary)}
      />
      <path
        d="M17.75 22.2L28 29.5"
        className={cn('stroke-[2.2] stroke-linecap-round stroke-linejoin-round', tone.rail)}
      />
      <circle cx="28.2" cy="29.6" r="2.35" className={tone.node} />
      <circle cx="22.3" cy="16.35" r="1.8" className={tone.node} />
    </svg>
  );
}

function Wordmark({ size, onDark = false }: { size: LogoSize; onDark?: boolean }) {
  const tone = getTone(onDark);
  const config = sizeMap[size];

  return (
    <span className="flex min-w-0 flex-col leading-none">
      <span className={cn('inline-flex items-center font-semibold tracking-[-0.08em]', config.wordmark, tone.primary)}>
        <span className="relative inline-flex items-center">
          <span className={cn('font-black', tone.secondary)}>P</span>
          <span className={cn('absolute -right-1 top-1 h-1.5 w-1.5 rounded-full', tone.chip)} aria-hidden="true" />
        </span>
        <span className="ml-0.5">it</span>
        <span className={cn('ml-0.5 font-black', tone.secondary)}>e</span>
        <span className="ml-0.5">ll</span>
      </span>
    </span>
  );
}

export default function PTLLogo({
  size = 'md',
  variant = 'default',
  animated = false,
  onDark = false,
  className,
  ...props
}: PTLLogoProps) {
  const config = sizeMap[size];
  const tone = getTone(onDark);

  if (variant === 'symbol') {
    return (
      <span className={cn('inline-flex items-center', className)} aria-label="Pitell" {...props}>
        <PitellSymbol
          onDark={onDark}
          className={cn(
            config.icon,
            animated && 'transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.03]',
          )}
        />
      </span>
    );
  }

  if (variant === 'wordmark') {
    return (
      <span className={cn('inline-flex items-center', className)} aria-label="Pitell" {...props}>
        <Wordmark size={size} onDark={onDark} />
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center',
          animated && 'transition-all duration-300 hover:-translate-y-0.5',
          className,
        )}
        aria-label="Pitell"
        {...props}
      >
        <Wordmark size={size} onDark={onDark} />
      </span>
    );
  }

  if (variant === 'stacked') {
    return (
      <span
        className={cn(
          'inline-flex flex-col items-start',
          animated && 'transition-transform duration-300 hover:-translate-y-0.5',
          className,
        )}
        aria-label="Pitell"
        {...props}
      >
        <span className={cn('inline-flex items-center justify-center border', config.frame, tone.frame)}>
          <PitellSymbol onDark={onDark} className={config.icon} />
        </span>
        <span className="mt-3">
          <Wordmark size={size} onDark={onDark} />
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center',
        animated && 'transition-all duration-300 hover:-translate-y-0.5',
        className,
      )}
      aria-label="Pitell"
      {...props}
    >
      <Wordmark size={size} onDark={onDark} />
    </span>
  );
}
