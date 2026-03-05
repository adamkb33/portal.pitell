import type { RouteBranch } from '~/lib/route-tree';

type SelectHandlers = {
  item: RouteBranch;
  level: number;
  onEnterSection?: (branch: RouteBranch, level: number) => void;
  onNavigate?: () => void;
};

export function onSidebarLinkSelect({ item, level, onEnterSection, onNavigate }: SelectHandlers) {
  if (item.children && item.children.length > 0) {
    onEnterSection?.(item, level);
    return;
  }

  onNavigate?.();
}
