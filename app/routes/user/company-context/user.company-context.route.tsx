import { data, Form, redirect, useNavigation } from 'react-router';
import { Building2, ChevronRight, MapPin } from 'lucide-react';
import { authService } from '~/lib/auth-service';
import { getAuthPayloadFromRequest } from '~/lib/auth.utils';
import { AuthController, type CompanySummaryDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import type { Route } from './+types/user.company-context.route';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithError } from '~/lib/flash-message.server';
import { Grid, KeyValueList, Notice, PageTemplate, Panel, SelectionCard, Text } from '~/ui';
import { getSafeReturnTo } from '~/utils';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const returnTo = getSafeReturnTo(url.searchParams.get('returnTo'));

  const auth = await getAuthPayloadFromRequest(request);

  return withAuth(request, async () => {
    try {
      const response = await AuthController.getCompanyContexts();
      const companyContexts = response.data?.data ?? [];

      if (companyContexts.length === 1) {
        const companyId = companyContexts[0].id;

        if (auth?.companyId === companyId) {
          return redirect(returnTo ?? '/');
        }

        try {
          return await signInToCompany(companyId, returnTo ?? ROUTES_MAP['company'].href);
        } catch (error) {
          console.error('[company-context] Automatic sign-in error:', error);
          return redirectWithError(request, '/', 'Kunne ikke logge inn i selskapet. Prøv igjen.');
        }
      }

      return data({ companyContexts, returnTo });
    } catch (error: any) {
      console.error('[company-context] Loader error:', error);
      return data({ companyContexts: [], returnTo });
    }
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const companyId = formData.get('companyId');
  const orgNumber = formData.get('orgNumber');
  const returnTo = getSafeReturnTo(String(formData.get('returnTo') || ''));

  if (!orgNumber || !companyId) {
    return redirectWithError(request, ROUTES_MAP['user.company-context'].href, 'Ikke valgt');
  }

  return withAuth(request, async () => {
    try {
      return await signInToCompany(parseInt(companyId.toString()), returnTo ?? '/');
    } catch (error: any) {
      console.error('[company-context] Action error:', error);
      return redirectWithError(
        request,
        ROUTES_MAP['user.company-context'].href,
        error?.response?.data?.message || 'Noe gikk galt. Prøv igjen.',
      );
    }
  });
}

async function signInToCompany(companyId: number, destination: string) {
  const response = await AuthController.companySignIn({ body: { companyId } });
  const tokens = response.data?.data;

  if (!tokens) {
    throw new Error('Company sign-in did not return tokens');
  }

  const headers = await authService.setAuthCookies(
    tokens.accessToken,
    tokens.refreshToken,
    tokens.accessTokenExpiresAt,
    tokens.refreshTokenExpiresAt,
  );
  return redirect(destination, { headers });
}

export default function CompanyContextPage({ loaderData }: Route.ComponentProps) {
  const companies = loaderData?.companyContexts || [];
  const returnTo = loaderData?.returnTo ?? null;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <PageTemplate
      title="Velg selskap"
      description="Logg inn i riktig selskapskontekst for å fortsette med administrasjon, booking eller timelister i samme felles sideoppsett som resten av produktet."
      label="Selskapskontekst"
      hero={
        <Panel title="Tilgjengelige selskaper" description="Alle selskaper du kan bytte inn i fra denne brukerkontoen.">
          <KeyValueList
            layout="compact"
            items={[{ label: 'Antall tilgjengelige kontekster', value: companies.length }]}
          />
        </Panel>
      }
    >
      {companies.length === 0 ? (
        <Panel title="Ingen selskaper funnet" description="Du har ikke tilgang til noen selskapskontekster enda.">
          <Notice
            tone="default"
            title="Ingen tilgang"
            message="Kontakt administrator hvis du forventer å se et selskap her."
          />
        </Panel>
      ) : (
        <Panel
          title="Velg kontekst"
          description="Hvert valg logger deg inn i valgt selskap og bruker samme tematiske sideuttrykk som company-flatene."
        >
          <Grid columns={3} gap="md">
            {companies.map((company) => (
              <Form key={company.id} method="post" className="h-full">
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="orgNumber" value={company.orgNumber} />
                <input type="hidden" name="returnTo" value={returnTo ?? ''} />
                <SelectionCard
                  type="submit"
                  className="h-full"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  title={company.name ?? 'Ukjent selskap'}
                  description={company.orgNumber ?? 'Mangler organisasjonsnummer'}
                  leading={
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface text-text-secondary">
                      <Building2 className="h-5 w-5" />
                    </div>
                  }
                  trailing={<ChevronRight className="mt-0.5 h-4 w-4 text-text-secondary" />}
                  meta={
                    company.postalAddress ? (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
                        <Text as="p" variant="body-sm" className="text-text-secondary">
                          {formatAddress(company.postalAddress)}
                        </Text>
                      </div>
                    ) : (
                      <Text as="p" variant="body-sm" className="text-text-secondary">
                        Ingen postadresse registrert
                      </Text>
                    )
                  }
                />
              </Form>
            ))}
          </Grid>
        </Panel>
      )}
    </PageTemplate>
  );
}

function formatAddress(address?: CompanySummaryDto['postalAddress']) {
  if (!address) return '';
  const parts = [...(address.addressLines || []), address.postalCode, address.city].filter(Boolean);
  return parts.join(', ');
}
