import { Gift, Star } from 'lucide-react';
import type { LoyaltyCardDto } from '~/api/generated';
import { cn } from '~/ui';

// Above this many slots a row of stamps no longer fits on a phone, so show a progress bar instead.
const MAX_STAMPS = 8;

/**
 * One row of stamps: slots 1 to N-1 are paid visits, the last slot is the free one.
 * Earned stamps get a star. `currentIndex` marks a booked visit that is not done yet ("Nå").
 */
export function LoyaltyProgress({ card, currentIndex = null }: { card: LoyaltyCardDto; currentIndex?: number | null }) {
  const paidVisits = card.visitsRequired - 1;
  const earned = Math.min(card.visitsInCycle, paidVisits);

  if (paidVisits < 1) return null;

  if (card.visitsRequired > MAX_STAMPS) {
    return (
      <div
        className="h-2.5 overflow-hidden rounded-full bg-booking-surface-raised"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={paidVisits}
        aria-valuenow={earned}
      >
        <div className="h-full rounded-full bg-booking-action" style={{ width: `${(earned / paidVisits) * 100}%` }} />
      </div>
    );
  }

  return (
    // Few stamps sit together; five or more spread across the card so the gift always ends the row.
    <div className={cn('flex', card.visitsRequired >= 5 ? 'justify-between' : 'gap-3')} aria-hidden>
      {Array.from({ length: card.visitsRequired }, (_, index) => {
        const isReward = index === paidVisits;
        const isEarned = index < earned;
        const isCurrent = index === currentIndex;

        return (
          <span
            key={index}
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold',
              isReward
                ? card.nextVisitIsFree
                  ? 'bg-booking-highlight text-booking-highlight-contrast'
                  : 'border-2 border-dashed border-booking-highlight bg-booking-surface-raised text-booking-highlight'
                : isEarned
                  ? 'bg-booking-action text-booking-action-contrast'
                  : isCurrent
                    ? 'border-2 border-booking-action bg-booking-surface-raised text-booking-action-text'
                    : 'border-2 border-booking-border-strong bg-booking-surface-raised text-booking-text-muted',
            )}
          >
            {isReward ? (
              <Gift className="size-4" />
            ) : isEarned ? (
              <Star className="size-4 fill-current" />
            ) : isCurrent ? (
              'Nå'
            ) : (
              index + 1
            )}
          </span>
        );
      })}
    </div>
  );
}
