import { z } from 'zod';
import { emailValidator } from '~/lib/form-validators';

const mobileNumberValidator = z
  .string()
  .min(1, 'Mobilnummer er påkrevd for å bestille time.')
  .length(8, 'Mobilnummer må være 8 siffer');
const optionalEmailValidator = z
  .union([z.literal(''), emailValidator])
  .optional()
  .transform((value) => (value ? value.trim() : undefined));

export const submitContactFormSchema = z.object({
  id: z.number().optional(),
  companyId: z.number(),
  givenName: z.string().min(1, 'Fornavn er påkrevd'),
  familyName: z.string().min(1, 'Etternavn er påkrevd'),
  email: optionalEmailValidator,
  mobileNumber: mobileNumberValidator,
});
