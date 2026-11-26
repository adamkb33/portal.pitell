import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../lib/cn';
import { overlayLayers } from '../lib/layers';

export function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

export function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 8,
  style,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'z-0 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-none',
          'border-[var(--color-overlay-border)] bg-[var(--color-overlay-surface)] text-text-primary',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        style={{ zIndex: overlayLayers.popover, ...style }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
