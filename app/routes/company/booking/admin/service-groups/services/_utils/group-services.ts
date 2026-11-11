import type { ServiceDto, ServiceGroupDto } from '~/api/generated';

export type ServiceGroupSection = {
  key: string;
  name: string;
  /** Position of the group among all groups, so its color stays the same while searching. Null for "Uten gruppe". */
  colorPosition: number | null;
  services: ServiceDto[];
};

/**
 * Services under their group, in the groups' own order. Groups without matching services are left out.
 * The search matches the service name or the group name, ignoring case.
 */
export function groupServices(
  serviceGroups: ServiceGroupDto[],
  services: ServiceDto[],
  search = '',
): ServiceGroupSection[] {
  const query = search.trim().toLocaleLowerCase('nb-NO');
  const matches = (service: ServiceDto, groupName: string) =>
    !query ||
    service.name.toLocaleLowerCase('nb-NO').includes(query) ||
    groupName.toLocaleLowerCase('nb-NO').includes(query);

  const knownGroupIds = new Set(serviceGroups.map((group) => group.id));
  const sections: ServiceGroupSection[] = serviceGroups.map((group, position) => ({
    key: `group-${group.id ?? position}`,
    name: group.name,
    colorPosition: position,
    services: services.filter((service) => service.serviceGroupId === group.id && matches(service, group.name)),
  }));

  const ungrouped = services.filter(
    (service) => !knownGroupIds.has(service.serviceGroupId) && matches(service, 'Uten gruppe'),
  );
  if (ungrouped.length) {
    sections.push({ key: 'ungrouped', name: 'Uten gruppe', colorPosition: null, services: ungrouped });
  }

  return sections.filter((section) => section.services.length > 0);
}

/** "400 kr", "1 250 kr": whole kroner, Norwegian grouping. */
export function formatServicePrice(price?: number) {
  return `${Math.round(Number(price ?? 0)).toLocaleString('nb-NO')} kr`;
}
