import type { FormPageHandle } from '~/lib/routing/create-action';
import type { TitleHandle } from '~/lib/routing/up-link';
import { data } from 'react-router';
import type { Route } from './+types/company.admin.contacts.edit.route';
import { ContactFormSchema, contactMissing, type ContactFormData } from '../_schemas/contact.form.schema';
import { ContactFormPage } from '../_components/contact-form-page';
import { CompanyUserContactController, type ContactDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { CompanyPageTemplate, PageNotice } from '~/ui';
import { redirectWithError, redirectWithInfo, redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';

/**
 * A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 5). The header and
 * breadcrumb name the contact, not "Rediger kontakt".
 */
export const handle: FormPageHandle & TitleHandle = {
  formPage: true,
  title: (loaderData) => {
    const values = (loaderData as { values?: ContactFormData; error?: string | null } | undefined)?.values;
    return values ? [values.givenName, values.familyName].filter(Boolean).join(' ') || null : null;
  },
};

const CONTACTS = ROUTES_MAP['company.admin.contacts'].href;

/** Back to the list as it was left (search and page), but only ever to the contact list. */
function safeReturnTo(value: string | null | undefined): string {
  return value && (value === CONTACTS || value.startsWith(`${CONTACTS}?`)) ? value : CONTACTS;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const contactId = Number(url.searchParams.get('contactId'));
  const returnTo = safeReturnTo(url.searchParams.get('returnTo'));

  if (!Number.isFinite(contactId) || contactId <= 0) {
    return redirectWithInfo(request, ROUTES_MAP['company.admin.contacts'].href, 'Velg en kontakt som skal redigeres.');
  }

  try {
    const response = await withAuth(request, async () =>
      CompanyUserContactController.getContacts1({
        query: {
          page: 0,
          size: 1000,
        },
      }),
    );

    const contact = (response.data?.data?.content ?? []).find((item: ContactDto) => item.id === contactId) ?? null;

    if (!contact) {
      return redirectWithInfo(
        request,
        ROUTES_MAP['company.admin.contacts'].href,
        'Fant ikke kontakten du prøvde å redigere.',
      );
    }

    return data({
      values: {
        id: contact.id,
        givenName: contact.givenName ?? '',
        familyName: contact.familyName ?? '',
        email: contact.email ?? '',
        mobileNumber: contact.mobileNumber ?? '',
      } satisfies ContactFormData,
      returnTo,
      error: null as string | null,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente kontakt');
    return data({
      values: {
        id: contactId,
        givenName: '',
        familyName: '',
        email: '',
        mobileNumber: '',
      } satisfies ContactFormData,
      returnTo,
      error: message,
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const id = Number(formData.get('id'));
  const returnTo = safeReturnTo(String(formData.get('returnTo') ?? ''));

  if (!Number.isFinite(id) || id <= 0) {
    return redirectWithError(request, CONTACTS, 'Fant ikke kontakten.');
  }

  if (formData.get('intent') === 'delete') {
    try {
      await withAuth(request, () => CompanyUserContactController.deleteContact1({ path: { id } }));
      return redirectWithSuccess(request, returnTo, 'Kontakt slettet');
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke slette kontakten. Prøv igjen.');
      const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
      return data({ error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
    }
  }

  const values: ContactFormData = {
    id,
    givenName: String(formData.get('givenName') ?? '').trim(),
    familyName: String(formData.get('familyName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    mobileNumber: String(formData.get('mobileNumber') ?? '').trim(),
  };

  // The page keeps Lagre disabled until this passes; this guards against a request made around it.
  const parsed = ContactFormSchema.safeParse(values);
  if (!parsed.success) {
    const error = contactMissing(values) ?? 'Kontroller feltene.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, async () => {
      await CompanyUserContactController.updateContact1({
        path: { id },
        body: {
          givenName: parsed.data.givenName,
          familyName: parsed.data.familyName,
          email: parsed.data.email || undefined,
          mobileNumber: parsed.data.mobileNumber || undefined,
        },
      });
    });

    return redirectWithSuccess(request, returnTo, 'Kontakt lagret');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke lagre kontakten. Prøv igjen.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyAdminContactsEditPage({ loaderData }: Route.ComponentProps) {
  if (loaderData.error) {
    return (
      <CompanyPageTemplate title="Kontakt">
        <PageNotice title="Kunne ikke hente kontakten" />
      </CompanyPageTemplate>
    );
  }
  // The form keeps what was typed itself, so a failed save never wipes it.
  return <ContactFormPage mode="edit" values={loaderData.values} returnTo={loaderData.returnTo} />;
}
