import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';
// Backend only supports sorting by startTime and endTime (see AppointmentSortResolver.kt)
export type SortableColumn = 'startTime' | 'endTime';

type SortableHeaderProps = {
  label: string;
  field: SortableColumn;
  activeField: SortableColumn;
  direction: SortDirection;
  onSort: (field: SortableColumn) => void;
};

export function SortableHeader({ label, field, activeField, direction, onSort }: SortableHeaderProps) {
  const isActive = activeField === field;
  const Icon = isActive ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      className="inline-flex w-full items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
      onClick={() => onSort(field)}
    >
      <span className="flex-1">{label}</span>
      <Icon className="h-3.5 w-3.5 text-slate-500" aria-hidden />
    </button>
  );
}
