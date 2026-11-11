import { useEffect } from 'react';
import { useLocation, useMatches } from 'react-router';
import type { Crumb } from './breadcrumbs';

/**
 * A page whose parent is one record, not a page in the route tree (Last opp bilde → that Timebestilling), names it
 * from its loader data. The breadcrumb gets the record before the current page, and the phone header's ‹ goes to it.
 * Everything else takes "up" from the route tree (`RouteBranch.up` or the tree parent).
 */
export type UpHandle = {
  up?: (data: unknown) => Crumb | null;
};

type MatchLike = { handle?: unknown; data?: unknown; loaderData?: unknown };

/** The deepest route that names its own parent wins. */
export function resolveUpOverride(matches: readonly MatchLike[]): Crumb | null {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    const up = (match.handle as UpHandle | undefined)?.up;
    if (typeof up === 'function') return up(match.loaderData ?? match.data);
  }
  return null;
}

export function useUpOverride(): Crumb | null {
  return resolveUpOverride(useMatches());
}

/**
 * A page that shows one record names itself from its loader data ("Ny timebestilling", not the route's "Vis varsel"):
 * the phone header and the breadcrumb's last crumb use it.
 */
export type TitleHandle = {
  title?: (data: unknown) => string | null;
};

/** Only the page being shown names itself; a parent's title never sticks to the pages below it. */
export function resolveTitleOverride(matches: readonly MatchLike[]): string | null {
  const page = matches.at(-1);
  const title = (page?.handle as TitleHandle | undefined)?.title;
  if (!page || typeof title !== 'function') return null;
  return title(page.loaderData ?? page.data)?.trim() || null;
}

export function useTitleOverride(): string | null {
  return resolveTitleOverride(useMatches());
}

/**
 * Up returns to a page as you left it: the list's search, page and period (`?search=…&page=1`, `?periode=tidligere`)
 * stay. Filled on the client only (from an effect), so the server never shares it between users.
 */
const lastSearchByPathname = new Map<string, string>();

export function rememberSearch(pathname: string, search: string) {
  lastSearchByPathname.set(pathname, search);
}

export function withLastSearch(href: string): string {
  const search = lastSearchByPathname.get(href);
  return search ? `${href}${search}` : href;
}

/** Where a breadcrumb or the ‹ goes: the search the page named, else the page as it was left. */
export function crumbHref(crumb: Crumb): string {
  return crumb.search !== undefined ? `${crumb.href}${crumb.search}` : withLastSearch(crumb.href);
}

/** Call once in the always-mounted header. */
export function useRememberSearch() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    rememberSearch(pathname, search);
  }, [pathname, search]);
}
