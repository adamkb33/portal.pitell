import { Check, Clock, Image as ImageIcon, Minus, Plus } from 'lucide-react';
import type { GroupedServiceDto } from '~/api/generated';
import { formatEstimatedDuration, formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import { cn } from '~/ui';

type ServiceRowProps = {
  service: GroupedServiceDto;
  quantity: number;
  onQuantityChange: (nextQuantity: number) => void;
  onViewImages?: () => void;
  disableIncrement?: boolean;
};

/**
 * One service: tap the row to choose it; a chosen row gets − n + for booking it more than once.
 * The − / + and photo buttons are 44px so they're easy to hit with a thumb.
 * Several can be chosen, so the control is a checkbox, not a radio.
 */
export function ServiceRow({ service, quantity, onQuantityChange, onViewImages, disableIncrement }: ServiceRowProps) {
  const selected = quantity > 0;
  const hasImages = Boolean(service.images?.length);
  const stepButtonClass =
    'grid size-11 place-items-center text-booking-text transition-colors hover:bg-booking-action-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-booking-action-text';

  return (
    <li className={cn('px-4 py-3', selected && 'bg-booking-action-muted')}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          disabled={!selected && disableIncrement}
          onClick={() => onQuantityChange(selected ? 0 : 1)}
          className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-booking-action-text disabled:opacity-50"
        >
          <span
            aria-hidden
            className={cn(
              'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors',
              selected
                ? 'border-booking-action bg-booking-action text-booking-action-contrast'
                : 'border-booking-border-strong bg-booking-surface-raised',
            )}
          >
            {selected ? <Check className="size-3" strokeWidth={3} /> : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-booking-text">{service.name}</span>
            <span className="mt-0.5 flex items-center gap-1 text-sm text-booking-text-muted">
              <Clock className="size-3.5" aria-hidden />
              {formatEstimatedDuration(service.duration)}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block whitespace-nowrap font-semibold tabular-nums text-booking-text">
              {formatEstimatedPrice(service.price * Math.max(quantity, 1))}
            </span>
            {quantity > 1 && (
              <span className="block whitespace-nowrap text-sm tabular-nums text-booking-text-muted">
                {quantity} × {formatEstimatedPrice(service.price)}
              </span>
            )}
          </span>
        </button>

        {hasImages ? (
          <button
            type="button"
            aria-label={`Se bilder av ${service.name}`}
            onClick={onViewImages}
            className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-booking-badge)] text-booking-text-muted transition-colors hover:bg-booking-action-muted hover:text-booking-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-booking-action-text"
          >
            <ImageIcon className="size-4" />
          </button>
        ) : null}
      </div>

      {selected ? (
        <div
          role="group"
          aria-label={`Antall ${service.name}`}
          className="ml-8 mt-1 inline-flex items-center overflow-hidden rounded-[var(--radius-booking-badge)] border-[length:var(--border-booking-card)] border-booking-border-strong bg-booking-surface-raised"
        >
          <button
            type="button"
            aria-label="Færre"
            className={stepButtonClass}
            onClick={() => onQuantityChange(quantity - 1)}
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-booking-text" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Flere"
            className={stepButtonClass}
            disabled={disableIncrement}
            onClick={() => onQuantityChange(quantity + 1)}
          >
            <Plus className="size-4" />
          </button>
        </div>
      ) : null}
    </li>
  );
}
