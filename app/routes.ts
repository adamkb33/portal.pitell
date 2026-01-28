import { type RouteConfig, index, layout } from '@react-router/dev/routes';
import { API_ROUTES_TREE, ROUTE_TREE } from './lib/route-tree';
import { buildApiRoutes, buildRoutesNested } from './lib/routes-builder';

export default [
  layout('routes/root.layout.tsx', [index('routes/root.route.tsx'), ...buildRoutesNested(ROUTE_TREE)]),
  ...buildApiRoutes(API_ROUTES_TREE),
] satisfies RouteConfig;
