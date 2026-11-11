import { describe, expect, it } from 'vitest';
import { BrachCategory, type RouteBranch } from '~/lib/routing/route-tree';
import { buildSections } from '~/routes/_components/sidebar';
import { getBottomNavItems } from '~/routes/_components/mobile-sidebar/mobile-sidebar';

function branch(id: string, children?: RouteBranch[], hidden = false): RouteBranch {
  return { id, href: `/${id.replaceAll('.', '/')}`, label: id, category: BrachCategory.COMPANY, children, hidden };
}

describe('flat sidebar sections shared by desktop and mobile', () => {
  it('keeps the root index and visible main destinations without promoting nested children', () => {
    const sections = buildSections([
      branch('company', [
        branch('company.admin', [branch('company.admin.employees')]),
        branch('company.booking', [branch('company.booking.profile')]),
        branch('company.secret', undefined, true),
      ]),
      branch('hidden-root', undefined, true),
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0].overview).toMatchObject({ href: '/company', label: 'Oversikt' });
    expect(sections[0].items.map((item) => item.id)).toEqual(['company.booking', 'company.admin']);
  });

  it('lists marketing after the other products and before administration', () => {
    const sections = buildSections([
      branch('company', [
        branch('company.admin'),
        branch('company.marketing', [branch('company.marketing.create', undefined, true)]),
        branch('company.timesheet'),
        branch('company.booking'),
      ]),
    ]);
    expect(sections[0].items.map((item) => item.id)).toEqual([
      'company.booking',
      'company.timesheet',
      'company.marketing',
      'company.admin',
    ]);
  });
});

describe('mobile bottom navigation', () => {
  it('shows overview, booking, timesheets and offers first, capped at four items', () => {
    const items = getBottomNavItems([
      branch('company', [
        branch('company.admin'),
        branch('company.booking'),
        branch('company.offer'),
        branch('company.timesheet'),
      ]),
    ]);
    expect(items.map((item) => item.id)).toEqual([
      'company.overview',
      'company.booking',
      'company.timesheet',
      'company.offer',
    ]);
  });

  it('fills the free slot with the next destination when a product is missing', () => {
    const items = getBottomNavItems([
      branch('company', [branch('company.admin'), branch('company.booking'), branch('company.timesheet')]),
    ]);
    expect(items.map((item) => item.id)).toEqual([
      'company.overview',
      'company.booking',
      'company.timesheet',
      'company.admin',
    ]);
  });
});
