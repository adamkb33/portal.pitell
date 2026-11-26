import { cn } from '../lib/cn';
import { type Space, gapSpaceClasses } from '../lib/spacing';

/**
 * 12-column dashboard grid (template `.grid` with `.col-6` / `.col-12`).
 * Children use `<GridCol span={…} />` to claim columns; spans collapse to full
 * width on mobile.
 */
export interface CardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Space;
}

export function CardGrid({ gap = 'lg', className, ...props }: CardGridProps) {
  return (
    <div
      className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12', gapSpaceClasses[gap], className)}
      {...props}
    />
  );
}

type GridSpan = 3 | 4 | 6 | 8 | 9 | 12;

const spanClasses: Record<GridSpan, string> = {
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
  12: 'lg:col-span-12',
};

export interface GridColProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: GridSpan;
}

export function GridCol({ span = 6, className, ...props }: GridColProps) {
  return <div className={cn('min-w-0', spanClasses[span], className)} {...props} />;
}
