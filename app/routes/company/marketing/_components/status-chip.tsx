import { cn } from '~/ui';

export type ChipTone = 'active' | 'muted' | 'danger' | 'quiet';

// Blue for what is happening now, red for what went wrong, outlined grey for what stopped, plain grey otherwise.
const toneClasses: Record<ChipTone, string> = {
  active: 'bg-interactive text-white',
  danger: 'bg-danger-soft text-danger',
  muted: 'border border-border bg-background text-text-secondary',
  quiet: 'bg-surface-variant-2 text-text-secondary',
};

export function StatusChip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
