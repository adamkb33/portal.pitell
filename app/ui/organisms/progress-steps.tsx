import { Text } from '../atoms/text';
import { cn } from '../lib/cn';

interface ProgressStepItem {
  id: string;
  label: string;
  status: 'complete' | 'current' | 'upcoming';
}

export interface ProgressStepsProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: ProgressStepItem[];
}

export function ProgressSteps({ steps, className, ...props }: ProgressStepsProps) {
  return (
    <ol className={cn('grid gap-3 md:grid-cols-2 lg:grid-cols-4', className)} {...props}>
      {steps.map((step, index) => {
        const isComplete = step.status === 'complete';
        const isCurrent = step.status === 'current';

        return (
          <li
            key={step.id}
            className={cn(
              'rounded-md border p-3',
              isCurrent ? 'border-interactive bg-surface' : 'border-border bg-background',
            )}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium',
                  isComplete || isCurrent
                    ? 'border-interactive bg-interactive text-text-inverse'
                    : 'border-border bg-background text-text-secondary',
                )}
              >
                {index + 1}
              </div>
              <Text as="span" variant="label" className={cn(!isCurrent && 'text-text-secondary')}>
                {step.label}
              </Text>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
