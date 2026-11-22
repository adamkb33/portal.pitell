import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { MarketingRecipientDto } from '~/api/generated';
import { Button, FullScreenSheet, Input, categoryTone, cn } from '~/ui';
import { pluralize } from '../../../_utils/campaigns';
import { recipientInitials, recipientName } from '../../../_utils/recipients';

const emailOf = (customer: MarketingRecipientDto) =>
  customer.channels.find((channel) => channel.channel === 'EMAIL')?.address ?? '';

/**
 * Mottakere (approved sketch 2026-11-19): every customer who said yes to e-post, all chosen by default. Search, "Alle"
 * and one row per customer (the whole row toggles). Changes apply with "Bruk"; ✕ leaves the choice as it was.
 */
export function RecipientsSheet({
  open,
  onOpenChange,
  customers,
  excludedUserIds,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: MarketingRecipientDto[];
  excludedUserIds: number[];
  onApply: (excludedUserIds: number[]) => void;
}) {
  const [excluded, setExcluded] = useState<Set<number>>(() => new Set(excludedUserIds));
  const [query, setQuery] = useState('');

  // Every time it opens, it starts from the choice the e-mail has now.
  useEffect(() => {
    if (open) {
      setExcluded(new Set(excludedUserIds));
      setQuery('');
    }
  }, [open, excludedUserIds]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      `${recipientName(customer)} ${emailOf(customer)}`.toLowerCase().includes(term),
    );
  }, [customers, query]);

  const chosen = customers.filter((customer) => !excluded.has(customer.userId)).length;
  // While searching, "Alle treff" chooses or clears only the customers shown, never the hidden ones.
  const searching = query.trim().length > 0;
  const shownChosen = shown.filter((customer) => !excluded.has(customer.userId)).length;
  const toggle = (userId: number) =>
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  const toggleAll = () =>
    setExcluded((current) => {
      const next = new Set(current);
      const chooseAll = shown.some((customer) => next.has(customer.userId));
      for (const customer of shown) {
        if (chooseAll) next.delete(customer.userId);
        else next.add(customer.userId);
      }
      return next;
    });

  return (
    <FullScreenSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Mottakere"
      footer={
        <>
          {chosen === 0 ? <p className="pb-2 text-center text-sm text-text-secondary">Velg minst én mottaker</p> : null}
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={chosen === 0}
            onClick={() => {
              onApply([...excluded]);
              onOpenChange(false);
            }}
          >
            {chosen === 0 ? 'Bruk' : `Bruk ${pluralize(chosen, 'mottaker', 'mottakere')}`}
          </Button>
        </>
      }
    >
      <div className="p-3 sm:px-4">
        <Input
          aria-label="Søk etter kunde"
          placeholder="Søk etter kunde"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          startIcon={<Search />}
          className="h-11 text-base"
        />
      </div>
      {shown.length ? (
        <label className="flex min-h-14 cursor-pointer items-center gap-3 border-y border-border px-4 font-semibold">
          <input
            type="checkbox"
            className="size-5 shrink-0 accent-[var(--color-interactive)]"
            checked={shownChosen === shown.length}
            ref={(element) => {
              if (element) element.indeterminate = shownChosen > 0 && shownChosen < shown.length;
            }}
            onChange={toggleAll}
          />
          <span className="flex-1">{searching ? 'Alle treff' : 'Alle'}</span>
          <span className="text-sm font-normal text-text-secondary">
            {searching ? shownChosen : chosen} av {searching ? shown.length : customers.length}
          </span>
        </label>
      ) : null}
      <ul
        aria-label="Kunder"
        className="[&>li+li_[data-list-divider]]:border-t [&>li+li_[data-list-divider]]:border-border"
      >
        {shown.map((customer) => {
          const tone = categoryTone(customer.userId);
          return (
            <li key={customer.userId}>
              <label className="flex min-h-14 cursor-pointer items-stretch pl-4 hover:bg-surface-variant-1">
                <span className="flex shrink-0 items-center py-1.5 pr-3">
                  <span
                    aria-hidden
                    className={cn('grid size-8 place-items-center rounded-full text-xs font-bold', tone.tint, tone.ink)}
                  >
                    {recipientInitials(customer)}
                  </span>
                </span>
                <span data-list-divider className="flex min-w-0 flex-1 items-center gap-3 py-1.5 pr-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] leading-5 font-semibold">
                      {recipientName(customer)}
                    </span>
                    <span className="block truncate text-[13px] leading-[18px] text-text-secondary">
                      {emailOf(customer)}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="size-5 shrink-0 accent-[var(--color-interactive)]"
                    checked={!excluded.has(customer.userId)}
                    onChange={() => toggle(customer.userId)}
                  />
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-text-secondary">
          {customers.length ? `Ingen treff på «${query.trim()}»` : 'Ingen har sagt ja til e-post ennå'}
        </p>
      ) : null}
    </FullScreenSheet>
  );
}
