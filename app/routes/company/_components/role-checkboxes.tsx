import { CompanyRole } from '~/api/clients/types';
import { Checkbox, cn } from '~/ui';

/** What each role can open, from the route access in `company.routes.ts`. */
export const ROLE_OPTIONS = [
  {
    value: CompanyRole.ADMIN as const,
    label: 'Administrator',
    description: 'Alt, også administrasjon og markedsføring',
  },
  { value: CompanyRole.EMPLOYEE as const, label: 'Ansatt', description: 'Booking, tilbud, timelister og kontakter' },
];

/** Role choices as selection rows: the whole row toggles; a chosen row gets a blue border and tint. */
export const RoleCheckboxes = ({
  value,
  onChange,
}: {
  value: CompanyRole[];
  onChange: (roles: CompanyRole[]) => void;
}) => (
  <div className="flex flex-col gap-2">
    {ROLE_OPTIONS.map((role) => {
      const isChecked = value?.includes(role.value);

      return (
        <label
          key={role.value}
          className={cn(
            'flex min-h-14 cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-2 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-interactive',
            isChecked
              ? 'border-interactive bg-interactive/10'
              : 'border-border bg-background hover:bg-surface-variant-1',
          )}
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => {
              const currentRoles = value || [];
              onChange(
                checked ? [...currentRoles, role.value] : currentRoles.filter((r: CompanyRole) => r !== role.value),
              );
            }}
            className="shrink-0"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-text-primary">{role.label}</span>
            <span className="block text-[13px] text-text-secondary">{role.description}</span>
          </span>
        </label>
      );
    })}
  </div>
);
