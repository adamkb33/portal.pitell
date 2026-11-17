/**
 * "+47 ••• 67": a mobile number with everything but the country code and the last two digits hidden, the same
 * shape the backend's MobileMasker gives the sign-in code step. Returns null for an email or something too short.
 */
export function maskMobile(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed.includes('@')) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 2) return null;
  const last = digits.slice(-2);

  if (trimmed.startsWith('+')) return `+${digits.slice(0, Math.max(2, digits.length - 8))} ••• ${last}`;
  if (trimmed.startsWith('00') && digits.length > 10) return `+${digits.slice(2, digits.length - 8)} ••• ${last}`;
  // A bare Norwegian number (8 digits), or one written with 47 in front.
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith('47'))) return `+47 ••• ${last}`;
  return `${digits.slice(0, 2)} ••• ${last}`;
}
