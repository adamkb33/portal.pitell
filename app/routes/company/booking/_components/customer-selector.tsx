import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Search, SearchX, UserPlus, X } from 'lucide-react';
import type { UserDto } from '~/api/generated';
import { Input, ListStrip, categoryTone, cn } from '~/ui';

type CustomerSelectorProps = {
  /** The newest customers without a search, the matches with one. */
  customers: UserDto[];
  /** Matches in total for the search (more than are shown when the search is broad). */
  totalMatches: number;
  onSelectCustomer: (customer: UserDto) => void;
  onAddNewCustomer: () => void;
  onSearchChange: (search: string) => void;
  initialSearch?: string;
};

/**
 * Ny time, step 1: one list card like the other lists. A search field, "Ny kunde" as the first row, then a short list:
 * the newest customers, or the matches for the search. A row picks the customer and moves on.
 */
export function CustomerSelector({
  customers,
  totalMatches,
  onSelectCustomer,
  onAddNewCustomer,
  onSearchChange,
  initialSearch = '',
}: CustomerSelectorProps) {
  const [search, setSearch] = useState(initialSearch);
  const onSearchChangeRef = useRef(onSearchChange);
  const lastSubmittedRef = useRef(initialSearch.trim());

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  // The URL is the source of truth; follow it when it changes from outside (back button).
  useEffect(() => {
    if (initialSearch.trim() === lastSubmittedRef.current) return;
    lastSubmittedRef.current = initialSearch.trim();
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    const next = search.trim();
    const timeout = setTimeout(() => {
      if (next === lastSubmittedRef.current) return;
      lastSubmittedRef.current = next;
      onSearchChangeRef.current(next);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const query = initialSearch.trim();

  return (
    <>
      <div className="relative p-3 sm:p-5">
        <Input
          aria-label="Søk etter kunde"
          placeholder="Søk på navn eller mobil"
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
            className="absolute right-4 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive sm:right-6 sm:size-8"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onAddNewCustomer}
        className="flex h-15 w-full items-center gap-3 border-t border-border px-4 text-left transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-accent-strong text-interactive">
          <UserPlus className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 font-semibold text-interactive">Ny kunde</span>
        <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
      </button>

      <ListStrip
        id="customer-list-heading"
        label={query ? `Treff på «${query}»` : 'Nyeste kunder'}
        count={query ? String(totalMatches) : undefined}
      />
      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-interactive">
            <SearchX className="size-6" aria-hidden />
          </span>
          <p className="font-semibold text-text-primary">
            {query ? `Ingen kunder heter «${query}»` : 'Ingen kunder ennå'}
          </p>
        </div>
      ) : (
        <ul aria-labelledby="customer-list-heading" className="divide-y divide-border">
          {customers.map((customer) => {
            const name = [customer.givenName, customer.familyName].filter(Boolean).join(' ') || 'Uten navn';
            const tone = categoryTone(customer.id);
            return (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => onSelectCustomer(customer)}
                  className="flex h-15 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold',
                      tone.tint,
                      tone.ink,
                    )}
                  >
                    {customerInitials(customer)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-text-primary">{name}</span>
                    <span className="block truncate text-sm text-text-secondary">
                      {customer.mobileNumber ? formatMobile(customer.mobileNumber) : customer.email}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function customerInitials(customer: Pick<UserDto, 'givenName' | 'familyName'>): string {
  const first = customer.givenName?.charAt(0)?.toUpperCase() ?? '';
  const last = customer.familyName?.charAt(0)?.toUpperCase() ?? '';
  return first + last || '?';
}

/** "+4791234567" → "912 34 567"; other numbers are shown as stored. */
export function formatMobile(mobileNumber: string): string {
  const digits = mobileNumber.replace(/\s/g, '').replace(/^\+47/, '');
  return /^\d{8}$/.test(digits) ? `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}` : mobileNumber;
}
