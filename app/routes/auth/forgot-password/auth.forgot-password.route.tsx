// auth.forgot-password.route.tsx (refactored)
import { Form, Link, data, useNavigation } from 'react-router';
import type { Route } from './+types/auth.forgot-password.route';

import { ROUTES_MAP } from '~/lib/route-tree';
import { AuthFormContainer } from '../_components/auth.form-container';
import { AuthFormField } from '../_components/auth.form-field';
import { AuthFormButton } from '../_components/auth.form-button';
import { AuthController } from '~/api/generated/identity';
import { redirectWithInfo } from '~/routes/company/_lib/flash-message.server';
import { resolveErrorPayload } from '~/lib/api-error';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get('email'));

  try {
    await AuthController.forgotPassword({
      body: { email },
    });

    return redirectWithInfo(request, '/', 'Vi har sendt deg en e-post');
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Noe gikk galt. Prøv igjen.');
    return data(
      {
        error: message,
        values: { email },
      },
      { status: status ?? 400 },
    );
  }
}

export default function AuthForgotPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const errorMessage = actionData?.error;
  const actionValues = actionData?.values;

  return (
    <AuthFormContainer
      title="Glemt passord"
      description="Oppgi din e-post for å tilbakestille ditt passord. Følg lenken du får tilsendt på din e-post adresse."
      error={errorMessage}
      secondaryAction={
        <>
          <Link
            to={ROUTES_MAP['auth.sign-in'].href}
            className="block text-center text-sm font-medium text-foreground hover:underline"
          >
            ← Tilbake til innlogging
          </Link>
          <Link to="/" className="mt-2 block text-center text-sm font-medium text-muted-foreground hover:underline">
            Hovedsiden →
          </Link>
        </>
      }
    >
      <Form method="post" className="space-y-6">
        <AuthFormField
          id="email"
          name="email"
          label="E-post adresse"
          type="email"
          autoComplete="email"
          placeholder="e-post"
          defaultValue={actionValues?.email}
          required
          disabled={isSubmitting}
        />

        <AuthFormButton isLoading={isSubmitting} loadingText="Behandler…">
          Send tilbakestillingskode
        </AuthFormButton>
      </Form>
    </AuthFormContainer>
  );
}
