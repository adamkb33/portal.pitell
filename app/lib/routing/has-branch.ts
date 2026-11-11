import type { RouteBranch } from './route-tree';

/** Whether the signed-in user's navigation tree contains the route `id` anywhere (i.e. they may open it). */
export function hasBranch(branches: readonly RouteBranch[], id: string): boolean {
  return branches.some((branch) => branch.id === id || hasBranch(branch.children ?? [], id));
}
