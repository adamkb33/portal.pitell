import type { FormPageHandle } from '~/lib/routing/create-action';
import { data } from 'react-router';
import type { Route } from './+types/company.admin.contacts.create.route';
import { ContactFormSchema, contactMissing, type ContactFormData } from '../_schemas/contact.form.schema';
import { ContactFormPage } from '../_components/contact-form-page';
import { CompanyUserContactController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 5). */
export const handle: FormPageHandle = { formPage: true };

const emptyValues: ContactFormData = {
  givenName: '',
  familyName: '',
  email: '',
  mobileNumber: '',
};

export async function loader() {
  return data({ values: emptyValues });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const values: ContactFormData = {
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
      await CompanyUserContactController.createContact1({
        body: {
          givenName: parsed.data.givenName,
          familyName: parsed.data.familyName,
          email: parsed.data.email || undefined,
          mobileNumber: parsed.data.mobileNumber || undefined,
        },
      });
    });

    // Back to the plain list, no search filled in (user's call 2026-11-14).
    return redirectWithSuccess(request, ROUTES_MAP['company.admin.contacts'].href, 'Kontakt lagret');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke lagre kontakten. Prøv igjen.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyAdminContactsCreatePage({ loaderData, actionData }: Route.ComponentProps) {
  return <ContactFormPage mode="create" values={loaderData.values} actionData={actionData} />;
}
