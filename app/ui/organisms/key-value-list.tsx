import { Text } from '../atoms/text';
import { cn } from '../lib/cn';

type KeyValueListLayout = 'stacked' | 'inline' | 'compact';

interface KeyValueItem {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

export interface KeyValueListProps extends React.HTMLAttributes<HTMLDListElement> {
  items: KeyValueItem[];
  layout?: KeyValueListLayout;
}

export function KeyValueList({ items, layout = 'inline', className, ...props }: KeyValueListProps) {
  if (layout === 'compact') {
    return (
      <dl className={cn('space-y-2', className)} {...props}>
        {items.map((item) => (
          <div key={item.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {item.icon ? <dt className="shrink-0 text-text-secondary">{item.icon}</dt> : null}
            <Text as="dt" variant="caption" className="text-text-secondary">
              {item.label}:
            </Text>
            <Text as="dd" variant="body-sm">
              {item.value}
            </Text>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={cn('space-y-3', className)} {...props}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'gap-2',
            layout === 'inline' ? 'grid items-start gap-y-1 md:grid-cols-2 md:gap-x-4' : 'flex flex-col',
          )}
        >
          <Text as="dt" variant="label" className="text-text-secondary">
            {item.icon ? <span className="mr-2 inline-flex align-middle">{item.icon}</span> : null}
            {item.label}
          </Text>
          <Text as="dd" variant="body" className="min-w-0">
            {item.value}
          </Text>
        </div>
      ))}
    </dl>
  );
}
