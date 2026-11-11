import { Plus } from 'lucide-react';
import { Link, useRouteLoaderData } from 'react-router';
import type { loader as rootLoader } from '~/routes/root.layout';
import { useCreateAction, type CreateAction } from '~/lib/routing/create-action';
import { RoutePlaceMent } from '~/lib/routing/route-tree';
import { hasBranch } from '~/lib/routing/has-branch';
import { Button, cn } from '~/ui';

/** The page's create action, if the signed-in user may use it. Shared by the phone button above the bottom menu and the desktop button. */
export function useAllowedCreateAction(): CreateAction | null {
  const action = useCreateAction();
  const rootData = useRouteLoaderData<typeof rootLoader>('routes/root.layout');
  const branches = rootData?.userNavigation?.[RoutePlaceMent.SIDEBAR] ?? [];
  if (!action) return null;
  if (action.requires && !hasBranch(branches, action.requires)) return null;
  return action;
}

/**
 * The page's create button for wide screens, at the right of the page toolbar. Below `lg` the button above the bottom
 * menu does the same thing, so this hides there. Renders nothing on pages without a create action.
 */
export function PageCreateButton({
  className,
  size,
}: {
  className?: string;
  /** Match the buttons next to it (e.g. "sm" in a row of small toolbar buttons). */
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const action = useAllowedCreateAction();
  if (!action) return null;

  return (
    <Button asChild size={size} className={cn('ml-auto hidden lg:inline-flex', className)}>
      <Link to={action.to}>
        <Plus aria-hidden />
        {action.label}
      </Link>
    </Button>
  );
}
