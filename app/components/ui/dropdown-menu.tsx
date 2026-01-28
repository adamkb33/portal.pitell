import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { CheckIcon, ChevronRightIcon } from 'lucide-react';

import { cn } from '~/lib/utils';

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          // Base styles - warm luxury
          'bg-popover text-popover-foreground z-50 min-w-[12rem] max-h-(--radix-dropdown-menu-content-available-height)',
          'origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto',
          // Breathing room - Emma's 8px grid
          'rounded-lg border border-border/50 p-2 shadow-lg',
          // Luxury shadow - warm tones
          'shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.08)]',
          // Smooth animations
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-96 data-[state=open]:zoom-in-96',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" className={cn('space-y-0.5', className)} {...props} />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'default' | 'destructive' | 'primary';
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        // Base - breathing room (Emma's rule: min 40px touch target)
        'relative flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-hidden select-none',
        'min-h-[40px]', // Touch-friendly
        // Typography hierarchy
        'font-medium transition-all duration-200',
        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        // Default state
        'text-foreground',
        // Hover - warm luxury
        'hover:bg-accent/10 hover:text-primary',
        'hover:shadow-sm hover:scale-[1.01]',
        "hover:[&_svg:not([class*='text-'])]:text-primary",
        // Focus (keyboard navigation)
        'focus:bg-accent/15 focus:text-primary focus:ring-2 focus:ring-ring/20 focus:ring-inset',
        // Active state
        'active:scale-[0.99] active:bg-accent/20',
        // Disabled
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[disabled]:grayscale',
        // Inset (for items with checkboxes)
        'data-[inset]:pl-10',
        // Primary variant - stronger emphasis
        'data-[variant=primary]:bg-primary/5 data-[variant=primary]:text-primary',
        'data-[variant=primary]:font-semibold data-[variant=primary]:hover:bg-primary/15',
        // Destructive variant - warm burgundy
        'data-[variant=destructive]:text-destructive',
        'data-[variant=destructive]:hover:bg-destructive/10',
        'data-[variant=destructive]:focus:bg-destructive/15',
        'data-[variant=destructive]:*:[svg]:!text-destructive',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        // Base
        'relative flex cursor-pointer items-center gap-3 rounded-md py-2.5 pr-3 pl-10 text-sm outline-hidden select-none',
        'min-h-[40px] font-medium transition-all duration-200',
        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Hover
        'hover:bg-accent/10 hover:text-primary hover:shadow-sm hover:scale-[1.01]',
        // Focus
        'focus:bg-accent/15 focus:text-primary focus:ring-2 focus:ring-ring/20 focus:ring-inset',
        // Active
        'active:scale-[0.99] active:bg-accent/20',
        // Disabled
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        className,
      )}
      checked={checked}
      {...props}
    >
      {/* Checkbox indicator - luxury styling */}
      <span className="pointer-events-none absolute left-3 flex size-4 items-center justify-center rounded border border-border transition-all duration-200 group-hover:border-primary">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5 text-primary" strokeWidth={3} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" className="space-y-0.5" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        // Base
        'relative flex cursor-pointer items-center gap-3 rounded-md py-2.5 pr-3 pl-10 text-sm outline-hidden select-none',
        'min-h-[40px] font-medium transition-all duration-200',
        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Hover
        'hover:bg-accent/10 hover:text-primary hover:shadow-sm hover:scale-[1.01]',
        // Focus
        'focus:bg-accent/15 focus:text-primary focus:ring-2 focus:ring-ring/20 focus:ring-inset',
        // Active
        'active:scale-[0.99] active:bg-accent/20',
        // Disabled
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        className,
      )}
      {...props}
    >
      {/* Radio indicator - luxury dot */}
      <span className="pointer-events-none absolute left-3 flex size-4 items-center justify-center rounded-full border border-border transition-all duration-200 group-hover:border-primary">
        <DropdownMenuPrimitive.ItemIndicator>
          <div className="size-2 rounded-full bg-primary shadow-sm" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        // Visual hierarchy - labels are SECONDARY
        'px-3 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        'data-[inset]:pl-10',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(
        // Breathing room - Emma's macro space
        'bg-border/60 -mx-1 my-2 h-px',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        // Tertiary emphasis - subtle but readable
        'ml-auto text-xs font-medium tracking-wide text-muted-foreground/70',
        'pl-4', // Breathing room from label
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        // Base
        'relative flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-hidden select-none',
        'min-h-[40px] font-medium transition-all duration-200',
        // Icon styling
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Hover
        'hover:bg-accent/10 hover:text-primary hover:shadow-sm hover:scale-[1.01]',
        "hover:[&_svg:not([class*='text-'])]:text-primary",
        // Focus
        'focus:bg-accent/15 focus:text-primary focus:ring-2 focus:ring-ring/20 focus:ring-inset',
        // Open state
        'data-[state=open]:bg-accent/15 data-[state=open]:text-primary',
        "data-[state=open]:[&_svg:not([class*='text-'])]:text-primary",
        // Inset
        'data-[inset]:pl-10',
        className,
      )}
      {...props}
    >
      {children}
      {/* Chevron - clear affordance */}
      <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        // Base
        'bg-popover text-popover-foreground z-50 min-w-[12rem]',
        'origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden',
        // Breathing room
        'rounded-lg border border-border/50 p-2 shadow-lg',
        // Luxury shadow
        'shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.08)]',
        // Animations
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-96 data-[state=open]:zoom-in-96',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
