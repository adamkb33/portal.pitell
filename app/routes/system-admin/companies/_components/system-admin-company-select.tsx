import type { SystemAdminCompanyDto } from '~/api/generated';
import { Label, Text } from '~/ui';
import { formatCompanyOptionLabel } from '../_utils/system-admin-company-display';

type SystemAdminCompanySelectProps = {
  companies: SystemAdminCompanyDto[];
  defaultValue?: number | string;
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  helperText?: string;
  requireGooglePlaceId?: boolean;
};

export function SystemAdminCompanySelect({
  companies,
  defaultValue,
  id,
  name = 'companyId',
  label = 'Selskap',
  required = true,
  helperText,
  requireGooglePlaceId = false,
}: SystemAdminCompanySelectProps) {
  const fieldId = id ?? name;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <select
        id={fieldId}
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="min-h-11 w-full rounded-[var(--radius-field)] border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:border-interactive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-50 sm:h-10 sm:min-h-10 sm:py-0"
      >
        <option value="" disabled={required}>
          {required ? 'Velg selskap' : 'Alle selskaper'}
        </option>
        {companies.map((company) => {
          const missingGooglePlaceId = requireGooglePlaceId && !company.googlePlaceId;
          return (
            <option key={company.id} value={company.id} disabled={missingGooglePlaceId}>
              {formatCompanyOptionLabel(company)}
              {missingGooglePlaceId ? ' - mangler Google Place ID' : ''}
            </option>
          );
        })}
      </select>
      {helperText ? (
        <Text as="p" variant="caption" className="text-text-secondary">
          {helperText}
        </Text>
      ) : null}
    </div>
  );
}
