import * as React from 'react';
import type { LucideProps } from 'lucide-react';
import { ICONS, type IconName } from './icon-map';
import { cn } from '../lib/cn';

export interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
  /** Pixel size; defaults to 1em so it scales with surrounding text. */
  size?: number | string;
}

/**
 * Thin wrapper over the lucide icon registry. Use `name` to draw any icon from
 * `ICONS` so callers don't import lucide directly and the icon set stays
 * centralized.
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = '1em', className, strokeWidth = 2, ...props },
  ref,
) {
  const LucideIcon = ICONS[name];
  return (
    <LucideIcon
      ref={ref}
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      {...props}
    />
  );
});
