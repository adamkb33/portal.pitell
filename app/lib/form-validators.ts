import { z } from 'zod';

export const emailValidator = z.email('Ugyldig e-postadresse');
