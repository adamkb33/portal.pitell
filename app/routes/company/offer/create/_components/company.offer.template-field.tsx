import type { OfferTemplateFieldDto } from '~/api/generated';
import { Checkbox, Input, Textarea } from '~/ui';
import type { TemplateFieldValue } from '../_types/company.offer.create.types';
import { getTemplateFieldName } from '../_utils/company.offer.create.utils';
import { OfferDatePicker } from './company.offer.date-picker';
import { CarPanelSelector } from './company.offer.car-panel-selector';

export function TemplateFieldInput({
  templateId,
  field,
  value,
}: {
  templateId: string;
  field: OfferTemplateFieldDto;
  value?: TemplateFieldValue;
}) {
  const name = getTemplateFieldName(templateId, field.key);
  const stringValue = typeof value === 'string' ? value : '';
  const label = `${field.label}${field.required ? ' *' : ''}`;

  if (field.type === 'textarea') {
    return (
      <label className="grid w-fit gap-1 text-sm text-text-primary">
        <span className="font-medium">{label}</span>
        <Textarea name={name} rows={4} defaultValue={stringValue} required={field.required} />
      </label>
    );
  }

  if (field.type === 'date') {
    return <OfferDatePicker name={name} label={label} defaultValue={stringValue} required={field.required} />;
  }

  if (field.type === 'panel_selector') {
    return <CarPanelSelector name={name} label={label} options={field.options || []} required={field.required} />;
  }

  if (field.type === 'text') {
    return (
      <label className="grid w-max gap-1 text-sm text-text-primary">
        <span className="font-medium">{label}</span>
        <Input
          name={name}
          defaultValue={stringValue}
          required={field.required}
          pattern={field.validation?.pattern}
          className="w-max max-w-full"
        />
      </label>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <p className="text-sm font-medium text-text-primary">{field.label}</p>
      <p className="mt-1 text-sm text-text-secondary">
        Feltet kan ikke fylles ut fordi typen `{field.type}` ikke støttes i frontend ennå.
      </p>
    </div>
  );
}
