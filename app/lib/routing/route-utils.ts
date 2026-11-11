import type { UserContextDto } from '~/api/generated';
import { Access, CompanyRole, RoutePlaceMent, type ApiRoute, type RouteBranch } from './route-types';

export type UserNavigation = Record<RoutePlaceMent, RouteBranch[]>;

export function buildApiRoutesMap(apiRoutesTree: ApiRoute[]): Record<string, { id: string; url: string }> {
  const map: Record<string, { id: string; url: string }> = {};

  const flattenBranch = (branch: ApiRoute): void => {
    map[branch.id] = {
      id: branch.id,
      url: branch.url,
    };

    if (branch.children) {
      branch.children.forEach((child) => flattenBranch(child));
    }
  };

  apiRoutesTree.forEach((branch) => flattenBranch(branch));
  return map;
}

export function buildRoutesMap(routeTree: RouteBranch[]): Record<string, { id: string; href: string }> {
  const map: Record<string, { id: string; href: string }> = {};

  const flattenBranch = (branch: RouteBranch): void => {
    map[branch.id] = {
      id: branch.id,
      href: branch.href,
    };

    if (branch.children) {
      branch.children.forEach((child) => flattenBranch(child));
    }
  };

  routeTree.forEach((branch) => flattenBranch(branch));
  return map;
}

type CompanyProduct = 'BOOKING' | 'EVENT' | 'OFFER' | 'MARKETING' | 'TIMESHEET';

function extractProductFromRoute(routeId: string): CompanyProduct | null {
  const routeParts = routeId.split('.');
  if (routeParts.includes('booking')) return 'BOOKING';
  if (routeParts.includes('event')) return 'EVENT';
  if (routeParts.includes('offer')) return 'OFFER';
  if (routeParts.includes('marketing')) return 'MARKETING';
  if (routeParts.includes('timesheet')) return 'TIMESHEET';
  return null;
}

function hasCompanyRole(roles: Array<'ADMIN' | 'EMPLOYEE'>, requiredRoles: CompanyRole[]): boolean {
  return requiredRoles.some((role) => roles.includes(role));
}

function hasRoleAccessAcrossCompanies(userContext: UserContextDto, requiredRoles?: CompanyRole[]): boolean {
  if (!requiredRoles?.length) {
    return true;
  }

  return userContext.companies.some((entry) => hasCompanyRole(entry.roles, requiredRoles));
}

function hasProductAccessAcrossCompanies(
  userContext: UserContextDto,
  product: CompanyProduct,
  requiredRoles?: CompanyRole[],
): boolean {
  return userContext.companies.some((entry) => {
    const hasProduct = entry.products.includes(product);
    if (!hasProduct) {
      return false;
    }

    if (!requiredRoles?.length) {
      return true;
    }

    return hasCompanyRole(entry.roles, requiredRoles);
  });
}

export function createNavigationForTree(
  routeTree: RouteBranch[],
  userContext?: UserContextDto | null,
  userRoles: string[] = [],
  isAuthenticatedOverride = false,
): UserNavigation {
  const isAuthenticated = isAuthenticatedOverride || !!userContext?.user;
  const hasCompanyMembership = (userContext?.companies?.length ?? 0) > 0;

  const hasAccess = (branch: RouteBranch): boolean => {
    if (branch.accessType === Access.PUBLIC) {
      return true;
    }

    if (branch.accessType === Access.NOT_AUTHENTICATED) {
      return !isAuthenticated;
    }

    if (!isAuthenticated) {
      return false;
    }

    if (branch.id === 'user.company-context' && (userContext?.companies?.length ?? 0) < 2) {
      return false;
    }

    if (branch.userRoles?.length) {
      const hasUserRole = branch.userRoles.some((requiredRole) => userRoles.includes(requiredRole));
      if (!hasUserRole) {
        return false;
      }
    }

    if (branch.accessType === Access.AUTHENTICATED) {
      return true;
    }

    if (!userContext || !hasCompanyMembership) {
      return false;
    }

    if (branch.accessType === Access.ROLE && !hasRoleAccessAcrossCompanies(userContext, branch.companyRoles)) {
      return false;
    }

    if (branch.accessType === Access.ROLE) {
      return true;
    }

    if (branch.accessType === Access.PRODUCT) {
      const product = extractProductFromRoute(branch.id);
      if (!product) {
        return false;
      }

      return hasProductAccessAcrossCompanies(userContext, product, branch.companyRoles);
    }

    return true;
  };

  const filterBranch = (branch: RouteBranch): RouteBranch[] => {
    if (!hasAccess(branch)) {
      return [];
    }

    const childBranches: RouteBranch[] = [];
    if (branch.children) {
      branch.children.forEach((child) => {
        childBranches.push(...filterBranch(child));
      });
    }

    if (branch.hidden) {
      return childBranches;
    }

    const filteredBranch: RouteBranch = {
      id: branch.id,
      href: branch.href,
      label: branch.label,
      accessType: branch.accessType,
      placement: branch.placement,
      hidden: branch.hidden,
      category: branch.category,
      userRoles: branch.userRoles,
      companyRoles: branch.companyRoles,
      iconName: branch.iconName,
      children: childBranches.length > 0 ? childBranches : undefined,
    };

    return [filteredBranch];
  };

  const filteredTree = routeTree.flatMap((branch) => filterBranch(branch));

  const collectByPlacement = (branches: RouteBranch[]): RouteBranch[] => {
    const result: RouteBranch[] = [];

    const traverse = (branch: RouteBranch, parentHasPlacement = false) => {
      const hasPlacement = branch.placement !== undefined;

      if (hasPlacement && !parentHasPlacement) {
        result.push(branch);
      }

      if (branch.children) {
        branch.children.forEach((child) => traverse(child, hasPlacement));
      }
    };

    branches.forEach((branch) => traverse(branch, false));
    return result;
  };

  const placementBranches = collectByPlacement(filteredTree);

  const result: UserNavigation = {
    [RoutePlaceMent.NAVIGATION]: [],
    [RoutePlaceMent.SIDEBAR]: [],
    [RoutePlaceMent.FOOTER]: [],
  };

  placementBranches.forEach((branch) => {
    if (branch.placement) {
      result[branch.placement].push(branch);
    }
  });

  return result;
}
