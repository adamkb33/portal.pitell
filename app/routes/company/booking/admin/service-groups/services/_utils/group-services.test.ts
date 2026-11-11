import { describe, expect, it } from 'vitest';
import type { ServiceDto, ServiceGroupDto } from '~/api/generated';
import { formatServicePrice, groupServices } from './group-services';

const groups = [
  { id: 1, name: 'Barn' },
  { id: 2, name: 'Kvinner' },
  { id: 3, name: 'Menn' },
] as ServiceGroupDto[];

const service = (id: number, name: string, serviceGroupId: number) =>
  ({ id, name, serviceGroupId, price: 400, duration: 20 }) as ServiceDto;

const services = [
  service(1, 'Hårklipp', 1),
  service(2, 'Hårklipp med føn', 2),
  service(3, 'Hårklipp', 3),
  service(4, 'Skjegg trim', 3),
];

describe('groupServices', () => {
  it('puts services under their group in the groups order', () => {
    const sections = groupServices(groups, services);
    expect(sections.map((section) => [section.name, section.services.map((s) => s.id)])).toEqual([
      ['Barn', [1]],
      ['Kvinner', [2]],
      ['Menn', [3, 4]],
    ]);
  });

  it('keeps each group on its own color position while searching', () => {
    const sections = groupServices(groups, services, 'skjegg');
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ name: 'Menn', colorPosition: 2 });
  });

  it('matches the group name too, ignoring case', () => {
    expect(groupServices(groups, services, 'KVINNER').map((section) => section.name)).toEqual(['Kvinner']);
  });

  it('leaves out groups without services', () => {
    expect(
      groupServices([...groups, { id: 9, name: 'Tom' } as ServiceGroupDto], services).map((s) => s.name),
    ).not.toContain('Tom');
  });

  it('collects services with an unknown group under "Uten gruppe" without a color', () => {
    const sections = groupServices(groups, [...services, service(5, 'Farge', 42)]);
    expect(sections.at(-1)).toMatchObject({ name: 'Uten gruppe', colorPosition: null });
  });
});

describe('formatServicePrice', () => {
  it('shows whole kroner', () => {
    expect(formatServicePrice(400)).toBe('400 kr');
    expect(formatServicePrice(1250).replace(/\s/g, ' ')).toBe('1 250 kr');
  });
});
