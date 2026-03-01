import { Form, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/auth.sign-out.route';

import { accessTokenCookie, refreshTokenCookie } from '~/routes/auth/_features/auth.cookies.server';
import { toAuthPayload } from '~/routes/auth/_utils/token-payload';
import { useEffect, useRef } from 'react';
import { AuthController } from '~/api/generated/base';

export async function action({ request }: Route.ActionArgs) {
  const cookieHeader = request.headers.get('Cookie');
  const accessToken = await accessTokenCookie.parse(cookieHeader);

  const expiredAccessCookie = await accessTokenCookie.serialize('', { maxAge: 0 });
  const expiredRefreshCookie = await refreshTokenCookie.serialize('', { maxAge: 0 });

  const headers = new Headers();
  headers.append('Set-Cookie', expiredAccessCookie);
  headers.append('Set-Cookie', expiredRefreshCookie);

  if (!accessToken) {
    return redirect('/auth/sign-in', { headers });
  }

  try {
    const authPayload = toAuthPayload(accessToken);
    if (!authPayload) {
      return redirect('/auth/sign-in', { headers });
    }

    await AuthController.signOut({
      body: { userId: authPayload.id },
    });

    return redirect('/', { headers });
  } catch (error) {
    console.error('[sign-out] Error:', error);

    return redirect('/auth/sign-in', { headers });
  }
}

export default function AuthSignOut() {
  const navigation = useNavigation();
  const formRef = useRef<HTMLFormElement>(null);
  const isProcessing = navigation.state === 'submitting';

  useEffect(() => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-12 text-center">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Logger ut</h1>
        <p className="text-sm text-muted-foreground">
          {isProcessing ? 'Vennligst vent mens vi avslutter økten din.' : 'Fullfører...'}
        </p>
      </header>

      <p className="text-sm text-muted-foreground">Du blir omdirigert om et øyeblikk.</p>
      <Form method="post" ref={formRef} className="hidden">
        <button type="submit">Sign out</button>
      </Form>
    </div>
  );
}
