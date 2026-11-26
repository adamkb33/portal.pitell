import { cn } from '../lib/cn';
import { type Space, gapSpaceClasses } from '../lib/spacing';
type InlineAlign = 'start' | 'center' | 'end';
type InlineJustify = 'start' | 'center' | 'end' | 'between';

export interface InlineProps extends React.HTMLAttributes<HTMLDivElement> {
  space?: Space;
  align?: InlineAlign;
  justify?: InlineJustify;
  wrap?: boolean;
}

const alignClasses: Record<InlineAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
};

const justifyClasses: Record<InlineJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

export function Inline({
  space = 'md',
  align = 'center',
  justify = 'start',
  wrap = false,
  className,
  ...props
}: InlineProps) {
  return (
    <div
      className={cn(
        'flex',
        wrap ? 'flex-wrap' : 'flex-nowrap',
        gapSpaceClasses[space],
        alignClasses[align],
        justifyClasses[justify],
        className,
      )}
      {...props}
    />
  );
}
