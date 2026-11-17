import { useState } from 'react';
import { Form, useNavigation } from 'react-router';
import { Mail, Phone } from 'lucide-react';
import { AuthPageTemplate, FormField, Stack } from '~/ui';
import { AuthSubmitBar } from './auth-submit-bar';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const KINDS = {
  email: {
    title: 'Legg til e-post',
    name: 'email',
    label: 'E-post',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'deg@eksempel.no',
    icon: <Mail />,
    missing: (value: string) => (EMAIL_PATTERN.test(value.trim()) ? null : 'Skriv inn en gyldig e-postadresse'),
  },
  mobile: {
    title: 'Legg til mobilnummer',
    name: 'mobileNumber',
    label: 'Mobilnummer',
    type: 'tel',
    autoComplete: 'tel',
    placeholder: undefined,
    icon: <Phone />,
    missing: (value: string) => (value.replace(/\D/g, '').length >= 8 ? null : 'Skriv inn mobilnummer'),
  },
} as const;

export type CollectContactKind = keyof typeof KINDS;

/** The first thing wrong with the value, or null when it can be sent. Also checked by the action. */
export function describeMissingContact(kind: CollectContactKind, value: string): string | null {
  return KINDS[kind].missing(value);
}

/**
 * "Legg til e-post" / "Legg til mobilnummer": an account (often from Google sign-in) that lacks one of them.
 * One field and Fortsett.
 */
export function CollectContactStep({ kind }: { kind: CollectContactKind }) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [value, setValue] = useState('');
  const field = KINDS[kind];

  return (
    <AuthPageTemplate title={field.title}>
      <Form method="post" aria-busy={isSubmitting}>
        <Stack space="md">
          <FormField
            id={field.name}
            name={field.name}
            label={field.label}
            type={field.type}
            autoComplete={field.autoComplete}
            placeholder={field.placeholder}
            startIcon={field.icon}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
            disabled={isSubmitting}
          />
          <AuthSubmitBar label="Fortsett" missing={field.missing(value)} loading={isSubmitting} />
        </Stack>
      </Form>
    </AuthPageTemplate>
  );
}
