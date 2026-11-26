import { cn } from '../lib/cn';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'default'
  | 'outline'
  | 'destructive'
  // soft status tones (template tags / pills / todo badges)
  | 'muted'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  // filled
  | 'solid';
type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Render a leading status dot (template `.badge.dot`). */
  dot?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-blue-50 text-interactive',
  secondary: 'border border-interactive text-interactive bg-surface',
  ghost: 'text-text-secondary',
  default: 'bg-surface-variant-2 text-text-secondary',
  outline: 'border border-border bg-background text-text-primary',
  destructive: 'bg-danger-soft text-danger',
  muted: 'bg-surface-variant-2 text-text-secondary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  purple: 'bg-purple-soft text-purple',
  solid: 'bg-interactive text-text-inverse',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10.5px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export function Badge({ variant = 'secondary', size = 'md', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold leading-none tracking-wide',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </div>
  );
}
