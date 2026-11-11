import type { FormPageHandle } from '~/lib/routing/create-action';
import { data, redirect } from 'react-router';
import type { Route } from './+types/company.admin.contacts.edit.route';
import { ContactFormSchema, type ContactFormData, type FieldErrors } from '../_schemas/contact.form.schema';
import { ContactFormPage } from '../_components/contact-form-page';
import { CompanyUserContactController, type ContactDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithInfo, setFlashMessage } from '~/lib/flash-message.server';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 2). */
export const handle: FormPageHandle = { formPage: true };

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const contactId = Number(url.searchParams.get('contactId'));
  const returnTo = url.searchParams.get('returnTo');

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
  const returnTo = String(formData.get('returnTo') ?? '') || null;
  const values: ContactFormData = {
    id,
    givenName: String(formData.get('givenName') ?? '').trim(),
    familyName: String(formData.get('familyName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    mobileNumber: String(formData.get('mobileNumber') ?? '').trim(),
  };

  const parsed = ContactFormSchema.safeParse(values);
  if (!parsed.success || !Number.isFinite(id) || id <= 0) {
    const fieldErrors: FieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof ContactFormData | undefined;
        if (path) fieldErrors[path] = issue.message;
      }
    }
    const error = 'Kontroller feltene og prøv igjen.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error, fieldErrors, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
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

    return redirect(returnTo || ROUTES_MAP['company.admin.contacts'].href);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke oppdatere kontakt');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyAdminContactsEditPage({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <ContactFormPage
      mode="edit"
      values={actionData?.values ?? loaderData.values}
      actionData={actionData ?? (loaderData.error ? { error: loaderData.error, values: loaderData.values } : null)}
      returnTo={loaderData.returnTo}
    />
  );
}
