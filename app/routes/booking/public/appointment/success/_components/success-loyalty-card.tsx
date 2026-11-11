import { ChevronRight, Gift } from 'lucide-react';
import { Link } from 'react-router';
import type { LoyaltyCardDto } from '~/api/generated';
import {
  buildLoyaltyHref,
  describeLoyaltyProgress,
} from '~/routes/booking/public/my-appointments/_utils/my-appointments.utils';
import { LoyaltyProgress } from '~/routes/booking/public/my-appointments/_components/loyalty-progress';

/**
 * Same count and sentence as the stamp card page, so the two never disagree. The backend only counts finished
 * visits, so the visit just booked is one of the visits still to go: it is marked "Nå" on the first open slot.
 */
export function getSuccessLoyaltyStamps(card: LoyaltyCardDto) {
  const paidVisits = card.visitsRequired - 1;
  if (paidVisits < 1) return null;

  return {
    paidVisits,
    doneCount: Math.min(card.visitsInCycle, paidVisits),
    // No "Nå" slot when every paid visit is already done (the free one is booked elsewhere).
    currentIndex: card.visitsInCycle < paidVisits ? card.visitsInCycle : null,
    title: describeLoyaltyProgress(card),
  };
}

export function SuccessLoyaltyCard({ card }: { card: LoyaltyCardDto }) {
  const stamps = getSuccessLoyaltyStamps(card);
  if (!stamps) return null;

  return (
    <Link
      to={buildLoyaltyHref(card.companyId)}
      aria-label={`${stamps.title}. Se stempelkort`}
      className="flex flex-col gap-3 rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-action-muted px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-booking-action-text"
    >
      <span className="flex items-center gap-3">
        <Gift className="size-5 shrink-0 text-booking-text" aria-hidden />
        <span className="min-w-0 flex-1 font-semibold text-booking-text">{stamps.title}</span>
        <ChevronRight className="size-5 shrink-0 text-booking-text-muted" aria-hidden />
      </span>
      {/* Same stamps as the stamp card page, with the visit just booked marked "Nå". */}
      <LoyaltyProgress card={card} currentIndex={stamps.currentIndex} />
    </Link>
  );
}
