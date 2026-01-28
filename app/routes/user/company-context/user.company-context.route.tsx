import { data, Form, redirect } from 'react-router';
import { CompanyContextSummaryCard } from '~/routes/user/company-context/_components/company-context-summary-card';
import { accessTokenCookie, refreshTokenCookie } from '~/routes/auth/_features/auth.cookies.server';
import { AuthController } from '~/api/generated/identity';
import { withAuth } from '~/api/utils/with-auth';
import type { Route } from './+types/user.company-context.route';

export async function loader({ request }: Route.LoaderArgs) {
  return withAuth(request, async () => {
    try {
      const response = await AuthController.getCompanyContexts();

      return data({
        companyContexts: response.data?.data,
      });
    } catch (error: any) {
      console.error('[company-context] Loader error:', error);
      return data({ companyContexts: [] });
    }
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const companyId = formData.get('companyId');
  const orgNumber = formData.get('orgNumber');

  if (!orgNumber || !companyId) {
    return data({ error: 'Ikke valgt' }, { status: 400 });
  }

  return withAuth(request, async () => {
    try {
      const response = await AuthController.companySignIn({
        body: {
          companyId: parseInt(companyId.toString()),
        },
      });

      const payload = response.data?.data;

      if (!payload) {
        return data({ error: 'En feil har skjedd ved innlogging til selskap' }, { status: 400 });
      }

      const accessCookie = await accessTokenCookie.serialize(payload.accessToken, {
        expires: new Date(payload.accessTokenExpiresAt * 1000),
      });
      const refreshCookie = await refreshTokenCookie.serialize(payload.refreshToken, {
        expires: new Date(payload.refreshTokenExpiresAt * 1000),
      });

      return redirect('/', {
        headers: [
          ['Set-Cookie', accessCookie],
          ['Set-Cookie', refreshCookie],
        ],
      });
    } catch (error: any) {
      console.error('[company-context] Action error:', error);
      return data(
        { error: error?.response?.data?.message || 'Noe gikk galt. Prøv igjen.' },
        { status: error?.response?.status || 400 },
      );
    }
  });
}

export default function CompanyContextPage({ loaderData }: Route.ComponentProps) {
  const companies = loaderData?.companyContexts || [];

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header className="rounded-lg border border-card-border bg-card p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selskapskontekst</p>
        <h1 className="mt-2 text-2xl font-semibold text-card-text sm:text-3xl">Velg selskap</h1>
        <p className="mt-2 text-sm text-card-text-muted sm:text-base">
          Logg inn i riktig selskap for å administrere tjenester, ansatte og booking.
        </p>
      </header>

      {companies.length === 0 ? (
        <div className="rounded-lg border border-card-border bg-card-muted-bg p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-card-text">Ingen selskaper funnet</p>
          <p className="mt-2 text-sm text-card-text-muted">Du har ikke tilgang til noen selskapskontekster enda.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg border border-card-border bg-card p-4 text-sm text-card-text-muted">
            <span>Tilgjengelige selskaper</span>
            <span className="font-medium text-card-text">{companies.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Form key={company.id} method="post" className="h-full">
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="orgNumber" value={company.orgNumber} />
                <CompanyContextSummaryCard company={company} />
              </Form>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
