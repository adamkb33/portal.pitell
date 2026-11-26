import { cn } from '../lib/cn';

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto bg-background">
      <table data-slot="table" className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead data-slot="table-header" className={cn('border-b border-border-soft bg-surface', className)} {...props} />
  );
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('divide-y divide-border-soft', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn('transition-colors hover:bg-surface data-[state=selected]:bg-blue-50/60', className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-4 py-3 text-left align-middle font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-disabled [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'px-4 py-3 align-middle text-sm text-text-secondary first:font-semibold first:text-text-primary [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] [&_[data-slot=badge]]:rounded-full',
        className,
      )}
      {...props}
    />
  );
}
