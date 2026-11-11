import type { GroupedServiceGroupDto } from '~/api/generated';
import type { FormFieldRenderProps } from '~/components/dialog/form-dialog';
import { Button } from '~/ui';

interface ServicesSelectionRendererProps {
  services: GroupedServiceGroupDto[];
  helperText?: string;
  maxHeight?: string;
  emptyText?: string;
}

/**
 * Compact services selection renderer with group and individual selection
 */
export const createServicesSelectionRenderer = ({
  services,
  helperText = 'Velg tjenestene du tilbyr.',
  emptyText = 'Ingen tjenester tilgjengelig',
}: ServicesSelectionRendererProps) => {
  return ({ value, onChange }: FormFieldRenderProps<any>) => {
    const selectedServiceIds = (value as number[]) || [];

    const toggleService = (serviceId: number) => {
      const isSelected = selectedServiceIds.includes(serviceId);
      const updated = isSelected
        ? selectedServiceIds.filter((id) => id !== serviceId)
        : [...selectedServiceIds, serviceId];
      onChange(updated);
    };

    const toggleGroup = (group: GroupedServiceGroupDto) => {
      const groupServiceIds = group.services.map((s) => s.id);
      const allSelected = groupServiceIds.every((id) => selectedServiceIds.includes(id));

      const updated = allSelected
        ? selectedServiceIds.filter((id) => !groupServiceIds.includes(id))
        : [...new Set([...selectedServiceIds, ...groupServiceIds])];
      onChange(updated);
    };

    const selectAll = () => {
      const allServiceIds = services.flatMap((group) => group.services.map((s) => s.id));
      onChange(allServiceIds);
    };

    const isGroupFullySelected = (group: GroupedServiceGroupDto) => {
      return group.services.every((service) => selectedServiceIds.includes(service.id));
    };

    const isGroupPartiallySelected = (group: GroupedServiceGroupDto) => {
      return !isGroupFullySelected(group) && group.services.some((service) => selectedServiceIds.includes(service.id));
    };

    const totalServices = services.reduce((sum, group) => sum + group.services.length, 0);
    const allSelected = selectedServiceIds.length === totalServices && totalServices > 0;

    return (
      <div className="space-y-2">
        {/* Select all button */}
        {services.length > 0 && (
          <Button
            variant={'secondary'}
            size={'sm'}
            className="w-full"
            type="button"
            onClick={selectAll}
            disabled={allSelected}
          >
            {allSelected ? '✓ Alle valgt' : 'Velg alle'}
          </Button>
        )}

        <div className="space-y-3 overflow-y-auto rounded border border-form-border bg-form-bg p-3">
          {services.length === 0 ? (
            <p className="text-sm text-form-text-muted">{emptyText}</p>
          ) : (
            services.map((group) => {
              const fullySelected = isGroupFullySelected(group);
              const partiallySelected = isGroupPartiallySelected(group);

              return (
                <div key={group.id} className="space-y-2">
                  {/* Group header */}
                  <div
                    className={`
                      rounded border-2 p-2 transition-all
                      ${
                        fullySelected
                          ? 'border-form-accent bg-form-accent/5'
                          : partiallySelected
                            ? 'border-form-accent/50 bg-form-accent/5'
                            : 'border-form-border bg-background'
                      }
                    `}
                  >
                    <label className="flex cursor-pointer items-center gap-2">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={fullySelected}
                          onChange={() => toggleGroup(group)}
                          className="h-4 w-4 flex-shrink-0 rounded border-form-border text-form-accent focus:ring-1 focus:ring-form-ring focus:ring-offset-0"
                        />
                        {partiallySelected && !fullySelected && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="h-2 w-2 rounded-sm bg-form-accent" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-form-text">{group.name}</p>
                      </div>
                      <span className="text-xs text-form-text-muted flex-shrink-0">{group.services.length}</span>
                    </label>
                  </div>

                  {/* Services */}
                  <div className="ml-5 space-y-1.5 pl-2 border-l border-form-border">
                    {group.services.map((service) => {
                      const isSelected = selectedServiceIds.includes(service.id);

                      return (
                        <label
                          key={service.id}
                          className={`
                            flex cursor-pointer items-start gap-2 rounded border p-2 transition-all
                            ${
                              isSelected
                                ? 'border-form-accent/30 bg-form-accent/5'
                                : 'border-transparent bg-background/50 hover:border-form-accent/20 hover:bg-form-accent/5'
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleService(service.id)}
                            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-form-border text-form-accent focus:ring-1 focus:ring-form-ring focus:ring-offset-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-form-text leading-tight">{service.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-form-text-muted">
                              <span>{service.duration} min</span>
                              <span>•</span>
                              <span>kr {service.price}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {helperText && <p className="text-xs text-form-text-muted mt-1">{helperText}</p>}
      </div>
    );
  };
};

/**
 * Direct component version
 */
export const ServicesSelectionRenderer = ({
  value,
  onChange,
  services,
  helperText = 'Velg tjenestene du tilbyr.',
  maxHeight = 'max-h-80',
  emptyText = 'Ingen tjenester tilgjengelig',
}: FormFieldRenderProps<any> & ServicesSelectionRendererProps) => {
  const selectedServiceIds = (value as number[]) || [];

  const toggleService = (serviceId: number) => {
    const isSelected = selectedServiceIds.includes(serviceId);
    const updated = isSelected
      ? selectedServiceIds.filter((id) => id !== serviceId)
      : [...selectedServiceIds, serviceId];
    onChange(updated);
  };

  const toggleGroup = (group: GroupedServiceGroupDto) => {
    const groupServiceIds = group.services.map((s) => s.id);
    const allSelected = groupServiceIds.every((id) => selectedServiceIds.includes(id));

    const updated = allSelected
      ? selectedServiceIds.filter((id) => !groupServiceIds.includes(id))
      : [...new Set([...selectedServiceIds, ...groupServiceIds])];
    onChange(updated);
  };

  const selectAll = () => {
    const allServiceIds = services.flatMap((group) => group.services.map((s) => s.id));
    onChange(allServiceIds);
  };

  const isGroupFullySelected = (group: GroupedServiceGroupDto) => {
    return group.services.every((service) => selectedServiceIds.includes(service.id));
  };

  const isGroupPartiallySelected = (group: GroupedServiceGroupDto) => {
    return !isGroupFullySelected(group) && group.services.some((service) => selectedServiceIds.includes(service.id));
  };

  const totalServices = services.reduce((sum, group) => sum + group.services.length, 0);
  const allSelected = selectedServiceIds.length === totalServices && totalServices > 0;

  return (
    <div className="space-y-2">
      {services.length > 0 && (
        <button
          type="button"
          onClick={selectAll}
          disabled={allSelected}
          className="w-full rounded border-2 border-form-accent bg-form-accent/10 px-3 py-2 text-sm font-medium text-form-accent transition-all hover:bg-form-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {allSelected ? '✓ Alle valgt' : 'Velg alle'}
        </button>
      )}

      <div className={`${maxHeight} space-y-3 overflow-y-auto rounded border border-form-border bg-form-bg p-3`}>
        {services.length === 0 ? (
          <p className="text-sm text-form-text-muted">{emptyText}</p>
        ) : (
          services.map((group) => {
            const fullySelected = isGroupFullySelected(group);
            const partiallySelected = isGroupPartiallySelected(group);

            return (
              <div key={group.id} className="space-y-2">
                <div
                  className={`
                    rounded border-2 p-2 transition-all
                    ${
                      fullySelected
                        ? 'border-form-accent bg-form-accent/5'
                        : partiallySelected
                          ? 'border-form-accent/50 bg-form-accent/5'
                          : 'border-form-border bg-background'
                    }
                  `}
                >
                  <label className="flex cursor-pointer items-center gap-2">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={fullySelected}
                        onChange={() => toggleGroup(group)}
                        className="h-4 w-4 flex-shrink-0 rounded border-form-border text-form-accent focus:ring-1 focus:ring-form-ring focus:ring-offset-0"
                      />
                      {partiallySelected && !fullySelected && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="h-2 w-2 rounded-sm bg-form-accent" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-form-text">{group.name}</p>
                    </div>
                    <span className="text-xs text-form-text-muted flex-shrink-0">{group.services.length}</span>
                  </label>
                </div>

                <div className="ml-5 space-y-1.5 pl-2 border-l border-form-border">
                  {group.services.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);

                    return (
                      <label
                        key={service.id}
                        className={`
                          flex cursor-pointer items-start gap-2 rounded border p-2 transition-all
                          ${
                            isSelected
                              ? 'border-form-accent/30 bg-form-accent/5'
                              : 'border-transparent bg-background/50 hover:border-form-accent/20 hover:bg-form-accent/5'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleService(service.id)}
                          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-form-border text-form-accent focus:ring-1 focus:ring-form-ring focus:ring-offset-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-form-text leading-tight">{service.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-form-text-muted">
                            <span>{service.duration} min</span>
                            <span>•</span>
                            <span>kr {service.price}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
      {helperText && <p className="text-xs text-form-text-muted mt-1">{helperText}</p>}
    </div>
  );
};
