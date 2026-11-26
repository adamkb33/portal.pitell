import { Text } from '../atoms/text';
import type { SectionHeaderProps } from '../molecules/section-header';
import { Card, CardContent, CardHead, type CardVariant } from './card';

type PanelTone = 'default' | 'muted' | 'emphasis';

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  label?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  tone?: PanelTone;
  variant?: 'default' | 'muted' | 'elevated';
  as?: 'section' | 'div' | 'article' | 'aside';
  children: React.ReactNode;
}

const toneClasses: Record<PanelTone, CardVariant> = {
  default: 'default',
  muted: 'subtle',
  emphasis: 'emphasis',
};

export function Panel({
  label,
  title,
  description,
  action,
  tone = 'default',
  variant,
  as: Component = 'section',
  className,
  children,
  ...props
}: PanelProps) {
  const resolvedTone: PanelTone = variant === 'elevated' ? 'emphasis' : variant === 'muted' ? 'muted' : tone;
  const headerProps: SectionHeaderProps | null = title
    ? {
        label,
        title,
        description,
        action,
      }
    : null;

  return (
    <Card as={Component} variant={toneClasses[resolvedTone]} className={className} {...props}>
      {headerProps ? (
        <CardHead eyebrow={headerProps.label} heading={headerProps.title} action={headerProps.action}>
          {headerProps.description ? (
            <Text as="p" variant="body-sm" className="text-text-secondary">
              {headerProps.description}
            </Text>
          ) : null}
        </CardHead>
      ) : null}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
