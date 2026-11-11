import { useRef } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/ui';
import { MERGE_FIELD_CHIPS, insertMergeField, type MergeFieldElement } from '../_utils/merge-fields';

type MergeFieldChipsProps = {
  /** The last text field the user was writing in. */
  getTarget: () => MergeFieldElement | null;
};

export function MergeFieldChips({ getTarget }: MergeFieldChipsProps) {
  const pendingField = useRef<(typeof MERGE_FIELD_CHIPS)[number]['field'] | null>(null);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <Plus className="h-4 w-4" aria-hidden /> Sett inn kundedetaljer{' '}
          <ChevronDown className="h-3 w-3" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          const field = pendingField.current;
          pendingField.current = null;
          if (!field) return;
          event.preventDefault();
          const target = getTarget();
          if (target) insertMergeField(target, field);
        }}
      >
        {MERGE_FIELD_CHIPS.map(({ field, label }) => (
          <DropdownMenuItem
            key={field}
            onSelect={() => {
              pendingField.current = field;
            }}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
