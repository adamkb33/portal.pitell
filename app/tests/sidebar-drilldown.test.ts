import { describe, expect, it, vi } from 'vitest';
import { BrachCategory, type RouteBranch } from '~/lib/route-tree';
import { onSidebarLinkSelect } from '~/routes/_components/sidebar-drilldown';

function createBranch(overrides: Partial<RouteBranch> = {}): RouteBranch {
  return {
    id: 'branch',
    href: '/branch',
    label: 'Branch',
    category: BrachCategory.COMPANY,
    ...overrides,
  };
}

describe('onSidebarLinkSelect', () => {
  it('keeps route navigation behavior while entering section for parent links', () => {
    const onEnterSection = vi.fn();
    const onNavigate = vi.fn();
    const parent = createBranch({
      id: 'company.booking',
      href: '/company/booking',
      children: [createBranch({ id: 'company.booking.child', href: '/company/booking/child' })],
    });

    onSidebarLinkSelect({
      item: parent,
      level: 1,
      onEnterSection,
      onNavigate,
    });

    expect(onEnterSection).toHaveBeenCalledWith(parent, 1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('navigates for leaf links', () => {
    const onEnterSection = vi.fn();
    const onNavigate = vi.fn();
    const leaf = createBranch({
      id: 'company.booking.appointments',
      href: '/company/booking/appointments',
      children: undefined,
    });

    onSidebarLinkSelect({
      item: leaf,
      level: 2,
      onEnterSection,
      onNavigate,
    });

    expect(onEnterSection).not.toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
