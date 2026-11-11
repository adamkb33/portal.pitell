import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

import { cn } from '~/lib/utils';

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default' | 'lg';
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        // Base styles
        'flex w-full items-center justify-between gap-2',
        'rounded-sm border border-field-border bg-background',
        'text-sm font-medium',
        'shadow-xs',
        'whitespace-nowrap',
        'outline-none',
        'transition-all duration-200',

        // Mobile-first sizing
        'h-11 px-3 py-3', // 44px mobile default
        'md:h-10 md:px-3 md:py-2.5', // 40px desktop default
        'data-[size=sm]:h-10 data-[size=sm]:px-3 data-[size=sm]:py-2.5', // 40px mobile sm
        'md:data-[size=sm]:h-9 md:data-[size=sm]:px-3 md:data-[size=sm]:py-2', // 36px desktop sm
        'data-[size=lg]:h-12 data-[size=lg]:px-4 data-[size=lg]:py-3.5', // 48px mobile lg
        'md:data-[size=lg]:h-11 md:data-[size=lg]:px-4 md:data-[size=lg]:py-3', // 44px desktop lg

        // States
        'hover:bg-muted/50',
        'hover:border-muted-foreground/20',
        'hover:shadow-sm',
        'active:scale-[0.99]',
        'active:shadow-xs',

        // Focus state (warm terracotta ring)
        'focus-visible:border-primary',
        'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',

        // Placeholder state
        'data-[placeholder]:text-muted-foreground',

        // Invalid state (warm burgundy)
        'aria-invalid:border-destructive',
        'aria-invalid:ring-2 aria-invalid:ring-destructive/20',

        // Disabled state
        'disabled:cursor-not-allowed',
        'disabled:opacity-50',
        'disabled:hover:bg-background',
        'disabled:hover:shadow-xs',

        // Value text styling
        '*:data-[slot=select-value]:line-clamp-1',
        '*:data-[slot=select-value]:flex',
        '*:data-[slot=select-value]:items-center',
        '*:data-[slot=select-value]:gap-2',

        // Icon styling
        '[&_svg]:pointer-events-none',
        '[&_svg]:shrink-0',
        "[&_svg:not([class*='size-'])]:size-4",
        "[&_svg:not([class*='text-'])]:text-muted-foreground",

        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'popper',
  align = 'center',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          // Base styles
          'relative z-50',
          'min-w-[8rem] max-h-(--radix-select-content-available-height)',
          'overflow-x-hidden overflow-y-auto',
          'rounded-sm border border-border',
          'bg-surface-variant-1 text-text-primary',
          'shadow-lg', // Use your warm shadow system
          'origin-(--radix-select-content-transform-origin)',

          // Animations
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2',
          'data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2',
          'data-[side=top]:slide-in-from-bottom-2',

          // Popper positioning
          position === 'popper' &&
            [
              'data-[side=bottom]:translate-y-1',
              'data-[side=left]:-translate-x-1',
              'data-[side=right]:translate-x-1',
              'data-[side=top]:-translate-y-1',
            ].join(' '),

          className,
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              [
                'h-[var(--radix-select-trigger-height)]',
                'w-full min-w-[var(--radix-select-trigger-width)]',
                'scroll-my-1',
              ].join(' '),
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        'px-2 py-1.5',
        'text-xs font-semibold uppercase tracking-wider',
        'text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // Base styles
        'relative flex w-full items-center gap-2',
        'cursor-default select-none',
        'rounded-sm',

        // Mobile-first sizing
        'min-h-[44px] py-3 pr-8 pl-2', // 44px mobile touch target
        'md:min-h-[36px] md:py-2 md:pr-8 md:pl-2', // 36px desktop

        'text-sm',
        'outline-none',
        'transition-colors duration-150',

        // Hover/focus state (warm accent)
        'focus:bg-accent/80',
        'focus:text-accent-foreground',

        // Disabled state
        'data-[disabled]:pointer-events-none',
        'data-[disabled]:opacity-50',

        // Icon styling
        '[&_svg]:pointer-events-none',
        '[&_svg]:shrink-0',
        "[&_svg:not([class*='size-'])]:size-4",
        "[&_svg:not([class*='text-'])]:text-muted-foreground",

        // Span styling (for value text)
        '*:[span]:flex',
        '*:[span]:items-center',
        '*:[span]:gap-2',

        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>

      {/* Check indicator - right aligned */}
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('-mx-1 my-1 h-px', 'bg-border', 'pointer-events-none', className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn('flex h-6 cursor-default items-center justify-center', 'text-muted-foreground', className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn('flex h-6 cursor-default items-center justify-center', 'text-muted-foreground', className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
