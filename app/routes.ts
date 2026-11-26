import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';
import { API_ROUTES_TREE, ROUTE_TREE } from './lib/routing/route-tree';
import { buildApiRoutes, buildRoutesNested } from './lib/routing/routes-builder';

const pageRoutes = buildRoutesNested(ROUTE_TREE);
const apiRoutes = buildApiRoutes(API_ROUTES_TREE);

export default [
  layout('routes/root.layout.tsx', [index('routes/root.route.tsx'), ...pageRoutes]),
  // Design-system reference page (Phase 2). Standalone, no auth layout.
  route('styleguide', 'routes/styleguide.tsx'),
  ...apiRoutes,
] satisfies RouteConfig;
