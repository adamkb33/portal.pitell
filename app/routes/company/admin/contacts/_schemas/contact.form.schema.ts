import { z } from 'zod';

/** Mobile numbers are typed with spaces ("912 34 567"); compare and send them without. */
export const normalizeMobile = (value: string | undefined) => (value ?? '').replace(/\s+/g, '');

export const ContactFormSchema = z.object({
  givenName: z.string().trim().min(1, 'Skriv inn fornavn').max(100, 'Maks 100 tegn'),
  familyName: z.string().trim().min(1, 'Skriv inn etternavn').max(100, 'Maks 100 tegn'),
  mobileNumber: z
    .string()
    .transform(normalizeMobile)
    .pipe(z.string().regex(/^$|^\+?\d{6,15}$/u, 'Skriv inn et gyldig mobilnummer'))
    .optional()
    .or(z.literal('')),
  email: z.string().trim().email('Skriv inn en gyldig e-postadresse').optional().or(z.literal('')),
});

export type ContactFormData = {
  id?: number;
  givenName: string;
  familyName: string;
  email?: string;
  mobileNumber?: string;
};

export type FieldErrors = Partial<Record<keyof ContactFormData, string>>;

/**
 * The first thing missing before the contact can be saved, in the order of the fields, or null when it's ready.
 * The page shows it in the Lagre bar and keeps Lagre disabled (ui-rules, rule 5); the action runs the same check.
 */
export function contactMissing(values: ContactFormData): string | null {
  const parsed = ContactFormSchema.safeParse(values);
  if (parsed.success) return null;
  const order: Array<keyof ContactFormData> = ['givenName', 'familyName', 'mobileNumber', 'email'];
  const issues = [...parsed.error.issues].sort(
    (a, b) => order.indexOf(a.path[0] as keyof ContactFormData) - order.indexOf(b.path[0] as keyof ContactFormData),
  );
  return issues[0]?.message ?? null;
}
