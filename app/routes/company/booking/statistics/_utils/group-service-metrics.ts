import type { BookingMonthServiceMetrics } from '~/api/generated';

export type ServiceMetricsGroup = {
  groupId: number;
  groupName: string;
  /** The group's place on the Tjenester page, which picks its color (categoryTone). */
  colorPosition: number;
  revenue: number;
  services: BookingMonthServiceMetrics[];
};

/**
 * The month's services under their group, the group with the most omsetning first. `groupOrder` is the group ids in
 * the order of the Tjenester page; without it, groups are placed by id, which is the order that page uses too.
 */
export function groupServiceMetrics(
  services: BookingMonthServiceMetrics[],
  groupOrder: number[],
): ServiceMetricsGroup[] {
  const byGroup = new Map<number, ServiceMetricsGroup>();
  for (const service of services) {
    const group = byGroup.get(service.groupId) ?? {
      groupId: service.groupId,
      groupName: service.groupName,
      colorPosition: 0,
      revenue: 0,
      services: [],
    };
    group.revenue += service.revenue;
    group.services.push(service);
    byGroup.set(service.groupId, group);
  }

  const order = groupOrder.length ? groupOrder : [...byGroup.keys()].sort((a, b) => a - b);
  return [...byGroup.values()]
    .map((group) => {
      const position = order.indexOf(group.groupId);
      return { ...group, colorPosition: position === -1 ? order.length : position };
    })
    .sort((a, b) => b.revenue - a.revenue || a.colorPosition - b.colorPosition);
}
