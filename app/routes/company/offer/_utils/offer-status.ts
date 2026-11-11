import type { BadgeVariant } from '~/ui';
import type { OfferDto } from '~/api/generated';

export const OFFER_STATUS_OPTIONS: Array<OfferDto['status']> = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'CANCELLED'];

export const OFFER_STATUS_LABELS: Record<OfferDto['status'], string> = {
  DRAFT: 'Utkast',
  SENT: 'Sendt',
  ACCEPTED: 'Akseptert',
  DECLINED: 'Avslått',
  CANCELLED: 'Kansellert',
};

export const OFFER_STATUS_BADGE_VARIANTS: Record<OfferDto['status'], BadgeVariant> = {
  DRAFT: 'info',
  SENT: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'danger',
  CANCELLED: 'danger',
};

export const OFFER_ACTION_INTENTS = {
  send: 'send',
  resend: 'resend',
  cancel: 'cancel',
  message: 'message',
  replaceLines: 'replace-lines',
  setRecipients: 'set-recipients',
  createContact: 'create-contact',
  revokeRecipient: 'revoke-recipient',
  enableRecipient: 'enable-recipient',
} as const;

export type OfferActionIntent = (typeof OFFER_ACTION_INTENTS)[keyof typeof OFFER_ACTION_INTENTS];

export function parseOfferStatus(value: string | null): OfferDto['status'] | undefined {
  if (!value) return undefined;
  return OFFER_STATUS_OPTIONS.includes(value as OfferDto['status']) ? (value as OfferDto['status']) : undefined;
}

export function canEditOffer(offer: Pick<OfferDto, 'status' | 'openForAction'>): boolean {
  return offer.status === 'DRAFT' || offer.openForAction;
}

export function canSendOffer(offer: Pick<OfferDto, 'status' | 'openForAction'>): boolean {
  return offer.status === 'DRAFT' || offer.openForAction;
}

export function canCancelOffer(offer: Pick<OfferDto, 'openForAction'>): boolean {
  return offer.openForAction;
}

export function canMessageOnOffer(offer: Pick<OfferDto, 'openForAction'>): boolean {
  return offer.openForAction;
}
