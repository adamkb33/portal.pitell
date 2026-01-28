// auth.sign-up.route.tsx
import { Link, useFetcher } from 'react-router';
import { API_ROUTES_MAP, ROUTES_MAP } from '~/lib/route-tree';
import { AuthFormContainer } from '../_components/auth.form-container';
import { AuthFormField } from '../_components/auth.form-field';
import { AuthFormButton } from '../_components/auth.form-button';

export default function AuthSignUp() {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === 'submitting';
  const errorMessage =
    typeof fetcher.data === 'object' && fetcher.data && 'error' in fetcher.data
      ? String(fetcher.data.error)
      : undefined;
  const action = API_ROUTES_MAP['auth.sign-up'].url;

  return (
    <AuthFormContainer
      title="Opprett konto"
      description="Registrer deg for å få tilgang til selskapet ditt og kundene dine."
      error={errorMessage}
      secondaryAction={
        <div className="space-y-2 text-center">
          <p className="text-xs text-muted-foreground">Har du allerede en konto?</p>
          <Link
            to={ROUTES_MAP['auth.sign-in'].href}
            className="inline-block text-sm font-medium text-foreground hover:underline"
          >
            Logg inn →
          </Link>
        </div>
      }
    >
      <fetcher.Form method="post" action={action} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthFormField
            id="givenName"
            name="givenName"
            label="Fornavn"
            autoComplete="given-name"
            placeholder="Ola"
            required
            disabled={isSubmitting}
          />

          <AuthFormField
            id="familyName"
            name="familyName"
            label="Etternavn"
            autoComplete="family-name"
            placeholder="Nordmann"
            required
            disabled={isSubmitting}
          />
        </div>

        <AuthFormField
          id="email"
          name="email"
          label="E-post"
          type="email"
          autoComplete="email"
          placeholder="e-post"
          required
          disabled={isSubmitting}
        />

        <AuthFormField
          id="mobileNumber"
          name="mobileNumber"
          label="Mobilnummer (valgfritt)"
          autoComplete="tel"
          placeholder="mobilnummer"
          disabled={isSubmitting}
        />

        <AuthFormField
          id="password"
          name="password"
          label="Passord"
          type="password"
          autoComplete="new-password"
          required
          disabled={isSubmitting}
        />

        <AuthFormField
          id="password2"
          name="password2"
          label="Bekreft passord"
          type="password"
          autoComplete="new-password"
          required
          disabled={isSubmitting}
        />

        <p className="text-xs text-form-text-muted">
          Vi sender en bekreftelseslenke til e-posten din. Oppgir du mobilnummer, får du også en engangskode på SMS.
        </p>

        <AuthFormButton isLoading={isSubmitting} loadingText="Oppretter konto…">
          Opprett konto
        </AuthFormButton>
      </fetcher.Form>
    </AuthFormContainer>
  );
}
