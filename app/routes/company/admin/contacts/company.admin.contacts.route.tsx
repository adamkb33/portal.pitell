import { useEffect, useRef, useState } from 'react';
import { Link, data, useLocation, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, Contact, Search, SearchX, X } from 'lucide-react';
import type { Route } from './+types/company.admin.contacts.route';
import { CompanyUserContactController, type ContactDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import type { CreateActionHandle } from '~/lib/routing/create-action';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { PageCreateButton } from '~/routes/_components/page-create-button';
import { formatMobile } from '~/routes/company/booking/_components/customer-selector';
import { Button, CompanyPageTemplate, Input, ListEmpty, ListStrip, PageNotice, categoryTone, cn } from '~/ui';

export const handle = {
  createAction: { label: 'Ny kontakt', to: ROUTES_MAP['company.admin.contacts.create'].href },
} satisfies CreateActionHandle;

const PAGE_SIZE = 10;
const MISSING_INFO = 'uten-kontaktinfo';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = Math.max(0, Number.parseInt(url.searchParams.get('page') || '0', 10) || 0);
  const search = url.searchParams.get('search')?.trim() || undefined;
  // From Statistikk: only contacts with neither mobile nor e-mail.
  const missingContactInfo = url.searchParams.get('vis') === MISSING_INFO || undefined;

  try {
    // A salon can have hundreds of customers: search and page on the server, A–Å by first name.
    const response = await withAuth(request, () =>
      CompanyUserContactController.getContacts1({
        query: { page, size: PAGE_SIZE, sort: 'givenName,asc', search, missingContactInfo },
      }),
    );
    const result = response.data?.data;
    return data({
      contacts: result?.content ?? [],
      page: result?.page ?? page,
      totalPages: result?.totalPages ?? 0,
      totalElements: result?.totalElements ?? 0,
      error: null as string | null,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente kontakter');
    return data({ contacts: [] as ContactDto[], page, totalPages: 0, totalElements: 0, error: message });
  }
}

/**
 * Kontakter (Liste, approved sketch 2026-11-14): one list card with search, contacts A–Å by first name under letter
 * strips, a count and pager. A row opens the contact; "Ny kontakt" is the page's create action.
 */
export default function CompanyContactsRoute({ loaderData }: Route.ComponentProps) {
  const { contacts, page, totalPages, totalElements, error } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  // After Lagre or Slett the contact page sends you back to this list as you left it.
  const returnTo = `${location.pathname}${location.search}`;
  const urlSearch = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(urlSearch);
  const lastSent = useRef(urlSearch.trim());

  // Follow the URL when it changes from outside (back/forward).
  useEffect(() => {
    if (urlSearch.trim() !== lastSent.current) {
      lastSent.current = urlSearch.trim();
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  // Search as you type, 300 ms after the last key; a new search starts on the first page.
  useEffect(() => {
    const term = search.trim();
    const timeoutId = setTimeout(() => {
      if (term === lastSent.current) return;
      lastSent.current = term;
      setSearchParams(
        (params) => {
          const next = new URLSearchParams(params);
          if (term) next.set('search', term);
          else next.delete('search');
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, setSearchParams]);

  const goToPage = (next: number) =>
    setSearchParams((params) => {
      const updated = new URLSearchParams(params);
      if (next > 0) updated.set('page', String(next));
      else updated.delete('page');
      return updated;
    });

  if (error) {
    return (
      <CompanyPageTemplate title="Kontakter">
        <PageNotice title="Kunne ikke hente kontakter" />
      </CompanyPageTemplate>
    );
  }

  const groups = groupByLetter(contacts);
  const query = urlSearch.trim();
  const onlyMissing = searchParams.get('vis') === MISSING_INFO;
  const clearMissing = () =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete('vis');
      next.delete('page');
      return next;
    });

  return (
    <CompanyPageTemplate title="Kontakter">
      <section
        aria-label="Kontakter"
        className="max-w-190 overflow-hidden rounded-xl border border-border bg-background"
      >
        <div className="flex items-center gap-3 p-3 sm:p-5">
          <div className="relative flex-1">
            <Input
              aria-label="Søk etter navn, e-post eller mobil"
              placeholder="Søk etter navn, e-post eller mobil"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              startIcon={<Search />}
              className="h-11 pr-11 text-base sm:h-10"
            />
            {search ? (
              <button
                type="button"
                aria-label="Tøm søk"
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive sm:size-8"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <PageCreateButton className="ml-0" />
        </div>
        {onlyMissing ? (
          <div className="flex items-center gap-2 px-3 pb-3 sm:px-5 sm:pb-4">
            <button
              type="button"
              onClick={clearMissing}
              aria-label="Fjern filteret Uten mobil og e-post"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-interactive/10 px-3 text-sm font-semibold text-interactive transition-colors hover:bg-interactive/15 focus-visible:outline-2 focus-visible:outline-interactive"
            >
              Uten mobil og e-post
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}

        {groups.map((group) => (
          <section key={group.letter} aria-labelledby={`contacts-${group.letter}`}>
            <ListStrip
              id={`contacts-${group.letter}`}
              label={group.letter}
              count={`${group.contacts.length} ${group.contacts.length === 1 ? 'kontakt' : 'kontakter'}`}
            />
            <ul className="divide-y divide-border">
              {group.contacts.map((contact) => (
                <li key={contact.id}>
                  <ContactRow contact={contact} returnTo={returnTo} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {contacts.length === 0 ? (
          query ? (
            <ListEmpty
              icon={SearchX}
              title={`Ingen treff på «${query}»`}
              action={
                <Button variant="outline" onClick={() => setSearch('')}>
                  Tøm søk
                </Button>
              }
            />
          ) : (
            <ListEmpty icon={Contact} title="Ingen kontakter ennå" />
          )
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-text-secondary sm:px-5">
            <p>
              {totalElements.toLocaleString('nb-NO')} {totalElements === 1 ? 'kontakt' : 'kontakter'}
            </p>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <span>
                  <span className="hidden sm:inline">Side </span>
                  {page + 1} av {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Forrige side"
                  disabled={page === 0}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Neste side"
                  disabled={page + 1 >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </CompanyPageTemplate>
  );
}

/** One contact: initials in their colour, name, mobile and e-mail; the whole row opens the contact. */
function ContactRow({ contact, returnTo }: { contact: ContactDto; returnTo: string }) {
  const tone = categoryTone(contact.id);
  const name = [contact.givenName, contact.familyName].filter(Boolean).join(' ') || 'Uten navn';
  const line = [contact.mobileNumber ? formatMobile(contact.mobileNumber) : null, contact.email]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      to={`${ROUTES_MAP['company.admin.contacts.edit'].href}?${new URLSearchParams({ contactId: String(contact.id), returnTo })}`}
      className="flex h-15 items-center gap-3 px-4 transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
    >
      <span
        aria-hidden
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold',
          tone.tint,
          tone.ink,
        )}
      >
        {initials(contact)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{name}</span>
        {line ? <span className="block truncate text-sm text-text-secondary">{line}</span> : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}

/** Contacts arrive sorted by first name; group them under their first letter ("#" for anything else). */
function groupByLetter(contacts: ContactDto[]) {
  const groups: Array<{ letter: string; contacts: ContactDto[] }> = [];
  for (const contact of contacts) {
    const first = contact.givenName?.trim().charAt(0).toLocaleUpperCase('nb-NO') ?? '';
    const letter = /\p{L}/u.test(first) ? first : '#';
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.contacts.push(contact);
    else groups.push({ letter, contacts: [contact] });
  }
  return groups;
}

const initials = (contact: ContactDto) =>
  [contact.givenName, contact.familyName]
    .filter(Boolean)
    .map((part) => part.trim()[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || '?';
