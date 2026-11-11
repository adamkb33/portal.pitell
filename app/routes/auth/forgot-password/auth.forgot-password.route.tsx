// auth.forgot-password.route.tsx (refactored)
import { Form, Link, useNavigation } from 'react-router';
import type { Route } from './+types/auth.forgot-password.route';

import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { AuthController } from '~/api/generated';
import { redirectWithError, redirectWithInfo } from '~/lib/flash-message.server';
import { resolveErrorPayload } from '~/lib/api-error';
import { AuthPageTemplate, Button, FormField } from '~/ui';
import { Mail } from 'lucide-react';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get('email'));

  try {
    await AuthController.forgotPassword({
      body: { email },
    });

    return redirectWithInfo(request, '/', 'Vi har sendt deg en e-post');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Noe gikk galt. Prøv igjen.');
    return redirectWithError(request, ROUTES_MAP['auth.forgot-password'].href, message);
  }
}

export default function AuthForgotPassword({}: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <AuthPageTemplate
      title="Glemt passord"
      description="Oppgi din e-post for å tilbakestille ditt passord. Følg lenken du får tilsendt på din e-post adresse."
      topRight={
        <span>
          Husker du passordet?{' '}
          <Link
            to={ROUTES_MAP['auth.sign-in'].href}
            className="font-semibold text-interactive hover:text-interactive-hover"
          >
            Logg inn
          </Link>
        </span>
      }
      bottom="Du får en lenke på e-post hvis kontoen finnes hos oss."
    >
      <Form method="post" className="space-y-4">
        <FormField
          id="email"
          name="email"
          label="E-post adresse"
          type="email"
          autoComplete="email"
          placeholder="deg@firma.no"
          startIcon={<Mail />}
          required
          disabled={isSubmitting}
        />

        <Button type="submit" fullWidth loading={isSubmitting}>
          Send tilbakestillingskode
        </Button>
      </Form>
    </AuthPageTemplate>
  );
}
