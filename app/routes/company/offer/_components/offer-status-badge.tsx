import type { OfferDto } from '~/api/generated';
import { Badge } from '~/ui';
import { OFFER_STATUS_BADGE_VARIANTS, OFFER_STATUS_LABELS } from '../_utils';

export function OfferStatusBadge({ status }: { status: OfferDto['status'] }) {
  return (
    <Badge variant={OFFER_STATUS_BADGE_VARIANTS[status]} size="sm" dot>
      {OFFER_STATUS_LABELS[status]}
    </Badge>
  );
}
