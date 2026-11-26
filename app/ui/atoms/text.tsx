import { cn } from '../lib/cn';

type TextVariant =
  | 'display'
  | 'heading-lg'
  | 'heading-md'
  | 'heading-sm'
  | 'body-lg'
  | 'body'
  | 'body-sm'
  | 'label'
  | 'caption'
  | 'overline';

type TextElement = 'p' | 'span' | 'div' | 'dt' | 'dd' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  as?: TextElement;
  children: React.ReactNode;
}

const variantClasses: Record<TextVariant, string> = {
  display: 'text-5xl font-semibold leading-tight tracking-tight',
  'heading-lg': 'text-3xl font-semibold leading-tight tracking-tight',
  'heading-md': 'text-2xl font-semibold leading-snug',
  'heading-sm': 'text-xl font-medium leading-snug',
  'body-lg': 'text-lg font-regular leading-relaxed',
  body: 'text-base font-regular leading-normal',
  'body-sm': 'text-sm font-regular leading-normal',
  label: 'text-sm font-medium leading-normal tracking-wide',
  caption: 'text-xs font-regular leading-normal tracking-wide',
  overline: 'text-xs font-medium leading-normal tracking-widest',
};

export function Text({ variant = 'body', as: Component = 'span', className, children, ...props }: TextProps) {
  return (
    <Component className={cn('text-text-primary', variantClasses[variant], className)} {...props}>
      {children}
    </Component>
  );
}
