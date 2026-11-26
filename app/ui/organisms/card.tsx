import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { Text } from '../atoms/text';
import { cn } from '../lib/cn';
import { insetSpaceClasses, type InsetSpace } from '../lib/spacing';

export type CardVariant = 'default' | 'subtle' | 'emphasis' | 'interactive' | 'ghost' | 'bordered';
type CardSize = InsetSpace;

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  size?: CardSize;
  as?: 'div' | 'section' | 'article' | 'aside';
}

const variantClasses: Record<CardVariant, string> = {
  // Template cards are elevated white surfaces on the bluish page background.
  default: 'border-border bg-background text-text-primary shadow-[var(--shadow-card)]',
  subtle: 'border-border/80 bg-surface-variant-1 text-text-primary shadow-sm',
  emphasis: 'border-interactive/35 bg-surface-primary-subtle text-text-primary shadow-[var(--shadow-panel)]',
  interactive:
    'border-border bg-background text-text-primary shadow-[var(--shadow-card)] transition-[border-color,background-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-interactive/40 hover:bg-surface-variant-1 hover:shadow-[var(--shadow-floating)]',
  ghost: 'border-transparent bg-transparent text-text-primary shadow-none',
  bordered: 'border-border bg-background text-text-primary shadow-none',
};

export function Card({ variant = 'default', size = 'md', as: Component = 'div', className, ...props }: CardProps) {
  return (
    <Component
      className={cn(
        'rounded-[var(--radius-card)] border-[length:var(--border-card)]',
        variantClasses[variant],
        insetSpaceClasses[size],
        className,
      )}
      {...props}
    />
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn('space-y-4', className)} {...props} />;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return <div className={cn('mt-4 border-t-[length:var(--border-card)] border-border pt-4', className)} {...props} />;
}

/** Uppercase mono label (template `.eyebrow`). */
export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function Eyebrow({ className, ...props }: EyebrowProps) {
  return (
    <span
      className={cn(
        'block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-text-disabled',
        className,
      )}
      {...props}
    />
  );
}

/** Small accented action link in a card head (template `.card-action`). */
export interface CardActionProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export function CardAction({ asChild = false, className, ...props }: CardActionProps) {
  const Component = asChild ? Slot : 'span';
  return (
    <Component
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold text-interactive transition-colors hover:text-interactive-hover',
        '[&_svg]:size-3',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Card header row matching the template `.card-head`: an eyebrow + title block on
 * the left and an optional action on the right, with a bottom divider.
 */
export interface CardHeadProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: React.ReactNode;
  heading?: React.ReactNode;
  headingAs?: 'h2' | 'h3' | 'h4';
  action?: React.ReactNode;
}

export function CardHead({ eyebrow, heading, headingAs = 'h3', action, className, children, ...props }: CardHeadProps) {
  return (
    <div
      className={cn('mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4', className)}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-1">{eyebrow}</Eyebrow> : null}
        {heading ? (
          <Text as={headingAs} variant="heading-sm" className="font-display tracking-tight">
            {heading}
          </Text>
        ) : null}
        {children}
      </div>
      {action ? <div className="shrink-0 pb-0.5">{action}</div> : null}
    </div>
  );
}
