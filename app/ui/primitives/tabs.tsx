import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../lib/cn';

export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />;
}

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('inline-flex h-9 w-fit items-center rounded-md border border-border bg-surface p-1', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex h-full flex-1 items-center justify-center rounded-sm px-3 text-sm font-medium text-text-secondary transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive',
        'data-[state=active]:bg-background data-[state=active]:text-text-primary',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
