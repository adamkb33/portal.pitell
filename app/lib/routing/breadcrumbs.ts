import type { RouteBranch } from './route-types';

export type Crumb = {
  label: string;
  href: string;
  /**
   * The exact search to open `href` with ("?maned=2026-10", or "" for none), named by the page itself through
   * `handle.up`. Without it, up returns to the page as it was left (see `withLastSearch` in up-link.ts).
   */
  search?: string;
  /**
   * From `handle.up`: this page takes the place of the current page's parent in the trail, instead of being added
   * before the current page (Ny time started from Kalender: Booking / Kalender / Ny time).
   */
  replacesParent?: boolean;
};

export function buildCrumbs(branches: RouteBranch[], pathname: string): Crumb[] {
  const trail = resolveUps(branches, findTrail(branches, pathname));

  return trail.map((branch) => ({
    label: branch.label ?? branch.id,
    href: branch.crumbTo ?? branch.href,
  }));
}

/**
 * The page one level up, for the phone header's ‹ arrow (ui-rules → Page top). None on a domain's top pages:
 * the root (e.g. Mitt selskap) and the sections right under it (Booking, Tilbud, Timelister…) keep the menu instead.
 */
export function upCrumb(crumbs: Crumb[]): Crumb | null {
  return crumbs.length >= 3 ? crumbs[crumbs.length - 2] : null;
}

/**
 * Applies the page's own `handle.up` (see up-link.ts). A record the page belongs to goes just before the current
 * page; a page already in the trail takes the override's search (e.g. the month a Statistikk detail page shows).
 */
export function withUpOverride(crumbs: Crumb[], up: Crumb | null): Crumb[] {
  if (!up || crumbs.length === 0) return crumbs;
  if (up.replacesParent && crumbs.length >= 2) {
    return [...crumbs.slice(0, -2), up, crumbs[crumbs.length - 1]];
  }
  if (crumbs.some((crumb) => crumb.href === up.href)) {
    return crumbs.map((crumb) =>
      crumb.href === up.href && up.search !== undefined ? { ...crumb, search: up.search } : crumb,
    );
  }
  return [...crumbs.slice(0, -1), up, crumbs[crumbs.length - 1]];
}

/** Applies the page's own `handle.title` (see up-link.ts) to the current page, the last crumb. */
export function withTitle(crumbs: Crumb[], title: string | null): Crumb[] {
  if (!title || crumbs.length === 0) return crumbs;
  return [...crumbs.slice(0, -1), { ...crumbs[crumbs.length - 1], label: title }];
}

/** A page with `up` hangs under that page's own (resolved) trail instead of its tree parent. */
function resolveUps(
  branches: RouteBranch[],
  trail: RouteBranch[],
  seen: ReadonlySet<string> = new Set(),
): RouteBranch[] {
  if (trail.length === 0) return [];
  const last = trail[trail.length - 1];

  if (last.up && !seen.has(last.id)) {
    const upTrail = findTrailById(branches, last.up);
    if (upTrail.length > 0) return [...resolveUps(branches, upTrail, new Set([...seen, last.id])), last];
  }
  return [...resolveUps(branches, trail.slice(0, -1), seen), last];
}

function findTrailById(branches: RouteBranch[], id: string, currentTrail: RouteBranch[] = []): RouteBranch[] {
  for (const branch of branches) {
    const nextTrail = [...currentTrail, branch];
    if (branch.id === id) return nextTrail;
    const childTrail = findTrailById(branch.children ?? [], id, nextTrail);
    if (childTrail.length > 0) return childTrail;
  }
  return [];
}

function findTrail(branches: RouteBranch[], pathname: string, currentTrail: RouteBranch[] = []): RouteBranch[] {
  let bestTrail: RouteBranch[] = [];

  for (const branch of branches) {
    const nextTrail = [...currentTrail, branch];
    const branchMatches = matchesBranchPrefix(pathname, branch.href);

    if (branchMatches && isBetterTrail(nextTrail, bestTrail)) {
      bestTrail = nextTrail;
    }

    if (branch.children?.length) {
      const childTrail = findTrail(branch.children, pathname, nextTrail);
      if (isBetterTrail(childTrail, bestTrail)) {
        bestTrail = childTrail;
      }
    }
  }

  return bestTrail;
}

/**
 * Deeper trails win; at equal depth the more specific href wins (more segments: `…/availabilities/create` over its
 * sibling `…/availabilities`), then a static route beats a `:param` route.
 */
function isBetterTrail(candidate: RouteBranch[], current: RouteBranch[]): boolean {
  if (candidate.length !== current.length) return candidate.length > current.length;
  if (candidate.length === 0) return false;
  const candidateHref = candidate[candidate.length - 1].href;
  const currentHref = current[current.length - 1].href;
  const segmentDifference = splitPathSegments(candidateHref).length - splitPathSegments(currentHref).length;
  if (segmentDifference !== 0) return segmentDifference > 0;
  return countParams(candidateHref) < countParams(currentHref);
}

function countParams(href: string): number {
  return splitPathSegments(href).filter((part) => part.startsWith(':')).length;
}

/** The pathname is the branch itself or inside it; a `:param` segment must match a real segment. */
function matchesBranchPrefix(pathname: string, href: string): boolean {
  const pathnameParts = splitPathSegments(pathname);
  const hrefParts = splitPathSegments(href);

  if (hrefParts.length === 0) {
    return pathnameParts.length === 0;
  }

  if (hrefParts.length > pathnameParts.length) {
    return false;
  }

  return hrefParts.every((part, index) => part.startsWith(':') || part === pathnameParts[index]);
}

function splitPathSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}
