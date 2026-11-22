import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Search, Users, X } from 'lucide-react';
import type { MarketingRecipientDto } from '~/api/generated';
import { Input, Label, categoryTone, cn } from '~/ui';
import { recipientInitials, recipientName } from '../../../_utils/recipients';

const MAX_MATCHES = 6;

const emailOf = (customer: MarketingRecipientDto) =>
  customer.channels.find((channel) => channel.channel === 'EMAIL')?.address ?? '';

/**
 * Mottakere on Send (approved sketch 2026-11-22, after research: mail tools send to a group and leave people out with
 * "Don't send to", and long checkbox lists don't scale). Everyone who said yes is one row; "Ikke send til" is a search
 * field (WAI-ARIA combobox) whose matches leave a customer out, listed under it with ✕ to put them back. The page stays
 * short however many customers there are.
 */
export function RecipientsCard({
  customers,
  total,
  excludedUserIds,
  onChange,
  disabled = false,
}: {
  customers: MarketingRecipientDto[];
  /** Everyone who said yes to e-post. */
  total: number;
  excludedUserIds: number[];
  onChange: (excludedUserIds: number[]) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const term = query.trim().toLowerCase();

  const excludedCustomers = useMemo(() => {
    const byId = new Map(customers.map((customer) => [customer.userId, customer]));
    return excludedUserIds.flatMap((userId) => byId.get(userId) ?? []);
  }, [customers, excludedUserIds]);

  const allMatches = useMemo(() => {
    if (!term) return [];
    const excluded = new Set(excludedUserIds);
    // A name that starts with what was typed ("ma" → Mats, Magnus) comes before one that only contains it (Amalie).
    const rank = (customer: MarketingRecipientDto) =>
      recipientName(customer)
        .toLowerCase()
        .split(/\s+/)
        .some((word) => word.startsWith(term))
        ? 0
        : 1;
    return customers
      .filter(
        (customer) =>
          !excluded.has(customer.userId) &&
          `${recipientName(customer)} ${emailOf(customer)}`.toLowerCase().includes(term),
      )
      .sort((a, b) => rank(a) - rank(b));
  }, [customers, excludedUserIds, term]);
  const matches = allMatches.slice(0, MAX_MATCHES);
  const open = term.length > 0;
  const activeIndex = Math.min(active, matches.length - 1);

  const leaveOut = (customer: MarketingRecipientDto) => {
    onChange([...excludedUserIds, customer.userId]);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };
  const putBack = (userId: number) => {
    onChange(excludedUserIds.filter((excludedId) => excludedId !== userId));
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && matches.length) {
      event.preventDefault();
      setActive((activeIndex + 1) % matches.length);
    } else if (event.key === 'ArrowUp' && matches.length) {
      event.preventDefault();
      setActive((activeIndex - 1 + matches.length) % matches.length);
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (matches[activeIndex]) leaveOut(matches[activeIndex]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setQuery('');
    }
  };

  return (
    <section aria-label="Mottakere" className="rounded-xl border border-border bg-background">
      <div className="flex min-h-12 items-center gap-2.5 py-0.5 pr-4 pl-3.5 text-sm font-semibold text-text-primary">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-category-sky-tint text-category-sky-ink"
        >
          <Users className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate">Alle som har sagt ja</span>
        <span className="tabular-nums">{total}</span>
      </div>

      <div className="grid gap-2 border-t border-border p-3.5">
        <Label htmlFor={`${id}-search`}>Ikke send til</Label>
        <Input
          ref={inputRef}
          id={`${id}-search`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-matches`}
          aria-activedescendant={open && matches.length ? `${id}-match-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder="Søk etter kunde"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          startIcon={<Search />}
          className="h-11 text-base sm:h-10 sm:text-sm"
        />
        <div
          hidden={!open}
          className="overflow-hidden rounded-xl border border-border bg-background shadow-[var(--shadow-floating)]"
        >
          <ul id={`${id}-matches`} role="listbox" aria-label="Treff">
            {matches.map((customer, index) => (
              <li
                key={customer.userId}
                id={`${id}-match-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // Keep focus in the field, so the next name can be typed straight away.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => leaveOut(customer)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  'flex min-h-14 cursor-pointer items-stretch pl-3.5 [&+li_[data-list-divider]]:border-t [&+li_[data-list-divider]]:border-border',
                  index === activeIndex && 'bg-surface-variant-1',
                )}
              >
                <CustomerLine customer={customer} term={term} />
              </li>
            ))}
          </ul>
          {matches.length === 0 ? (
            <p className="px-4 py-4 text-center text-sm text-text-secondary">Ingen treff på «{query.trim()}»</p>
          ) : allMatches.length > matches.length ? (
            <p className="border-t border-border px-4 py-2 text-center text-[13px] text-text-secondary">
              {allMatches.length - matches.length} til – skriv mer av navnet
            </p>
          ) : null}
        </div>
      </div>

      {excludedCustomers.length ? (
        <ul aria-label="Ikke send til" className="border-t border-border">
          {excludedCustomers.map((customer) => (
            <li
              key={customer.userId}
              className="flex min-h-14 items-stretch pl-3.5 [&+li_[data-list-divider]]:border-t [&+li_[data-list-divider]]:border-border"
            >
              <CustomerLine
                customer={customer}
                end={
                  <button
                    type="button"
                    aria-label={`Send til ${recipientName(customer)} likevel`}
                    disabled={disabled}
                    onClick={() => putBack(customer.userId)}
                    className="-mr-1 grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-text-secondary hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive disabled:text-text-disabled"
                  >
                    <X className="size-[18px]" aria-hidden />
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Initials, name and e-mail like the list rows; the line between rows starts at the text. */
function CustomerLine({
  customer,
  term = '',
  end,
}: {
  customer: MarketingRecipientDto;
  term?: string;
  end?: ReactNode;
}) {
  const tone = categoryTone(customer.userId);
  return (
    <>
      <span className="flex shrink-0 items-center py-1.5 pr-3">
        <span
          aria-hidden
          className={cn('grid size-8 place-items-center rounded-full text-xs font-bold', tone.tint, tone.ink)}
        >
          {recipientInitials(customer)}
        </span>
      </span>
      <span data-list-divider className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-5 font-semibold text-text-primary">
            {marked(recipientName(customer), term)}
          </span>
          <span className="block truncate text-[13px] leading-[18px] text-text-secondary">
            {marked(emailOf(customer), term)}
          </span>
        </span>
        {end}
      </span>
    </>
  );
}

/** The part of the text that matches the search, marked. */
function marked(text: string, term: string): ReactNode {
  const start = term ? text.toLowerCase().indexOf(term) : -1;
  if (start < 0) return text;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded-sm bg-amber-100 text-inherit">{text.slice(start, start + term.length)}</mark>
      {text.slice(start + term.length)}
    </>
  );
}
