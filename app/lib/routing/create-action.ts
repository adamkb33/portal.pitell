import { useMatches } from 'react-router';

/**
 * The one "create" a list page offers (ui-rules, rule 4). Declared once in the list page's own route module (the
 * layout's index route, never the layout); the phone button above the bottom menu and the desktop toolbar button both
 * read it, so they can never disagree.
 */
export type CreateAction = {
  /** "Ny tjeneste", "Ny gruppe", "Bestill ny avtale"… The text of both the phone and the desktop button. */
  label: string;
  to: string;
  /** Sidebar branch id the user must have (e.g. 'company.booking.appointments'); left out when the route guards itself. */
  requires?: string;
};

export type CreateActionHandle = {
  /** Static, or from the route's own loader data (return null when the user may not create). */
  createAction?: CreateAction | ((data: unknown) => CreateAction | null);
};

/** Create/edit form pages: the phone bottom menu is hidden and the page shows its own Lagre bar (rule 2). */
export type FormPageHandle = {
  formPage?: boolean;
};

type MatchLike = { handle?: unknown; data?: unknown; loaderData?: unknown };

/**
 * Only the page being shown (the deepest match) counts; nothing is inherited from parent routes. So the create button
 * stops one level below the list: a detail page, an upload page or anything else nested under a list offers none.
 */
export function resolveCreateAction(matches: readonly MatchLike[]): CreateAction | null {
  const page = matches.at(-1);
  const declared = (page?.handle as CreateActionHandle | undefined)?.createAction;
  if (!page || !declared) return null;
  return typeof declared === 'function' ? declared(page.loaderData ?? page.data) : declared;
}

export function isFormPage(matches: readonly MatchLike[]): boolean {
  return matches.some((match) => Boolean((match.handle as FormPageHandle | undefined)?.formPage));
}

/** The current page's create action, or null when the page has nothing to create. */
export function useCreateAction(): CreateAction | null {
  return resolveCreateAction(useMatches());
}

export function useIsFormPage(): boolean {
  return isFormPage(useMatches());
}
