import { Link, Form, data, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/auth.collect-email.route';

import { AuthController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveAuthPostRedirect } from '../_utils/auth-flow.server';
import { redirectWithError } from '~/lib/flash-message.server';
import { AuthPageTemplate, Button, FormField } from '~/ui';
import { Mail } from 'lucide-react';

type LoaderData = {
  userId: number;
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const userId = Number(url.searchParams.get('userId') || '');

  if (!userId || Number.isNaN(userId)) {
    return redirect(ROUTES_MAP['auth.sign-in'].href);
  }

  return data({ userId } satisfies LoaderData);
}

export async function action({ request }: Route.ActionArgs) {
  const currentHref = new URL(request.url);
  const currentPath = `${currentHref.pathname}${currentHref.search}`;
  const formData = await request.formData();
  const userId = Number(formData.get('userId') || '');
  const email = String(formData.get('email') || '').trim();

  if (!userId || Number.isNaN(userId)) {
    return redirectWithError(request, currentPath, 'Mangler bruker-ID. Prøv igjen.');
  }

  try {
    const response = await AuthController.providerCompleteProfile({
      body: {
        userId,
        email,
      },
    });

    const payload = response.data?.data ?? null;
    const { nextStepHref, verificationCookieHeader } = await resolveAuthPostRedirect(payload);
    const headers = new Headers();

    if (verificationCookieHeader) {
      headers.append('Set-Cookie', verificationCookieHeader);
    }

    return redirect(nextStepHref ?? ROUTES_MAP['auth.sign-in'].href, {
      headers: headers.has('Set-Cookie') ? headers : undefined,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke lagre e-post. Prøv igjen.');
    return redirectWithError(request, currentPath, message);
  }
}

export default function AuthCollectEmail({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <AuthPageTemplate
      title="Legg til e-post"
      description="Vi trenger e-postadressen din for å fullføre registreringen."
      topRight={
        <span>
          Vil du starte på nytt?{' '}
          <Link
            to={ROUTES_MAP['auth.sign-in'].href}
            className="font-semibold text-interactive hover:text-interactive-hover"
          >
            Logg inn
          </Link>
        </span>
      }
      bottom="Denne informasjonen brukes til å fullføre profilen din."
    >
      <Form method="post" className="space-y-4" aria-busy={isSubmitting}>
        <input type="hidden" name="userId" value={loaderData.userId} />
        <FormField
          id="email"
          name="email"
          label="E-post"
          type="email"
          autoComplete="email"
          placeholder="deg@firma.no"
          startIcon={<Mail />}
          required
          disabled={isSubmitting}
        />

        <Button type="submit" fullWidth loading={isSubmitting}>
          Fortsett
        </Button>
      </Form>
    </AuthPageTemplate>
  );
}
