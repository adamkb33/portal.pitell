import type { FormPageHandle } from '~/lib/routing/create-action';
import { data, redirect } from 'react-router';
import type { Route } from './+types/company.admin.contacts.create.route';
import { ContactFormSchema, type ContactFormData, type FieldErrors } from '../_schemas/contact.form.schema';
import { ContactFormPage } from '../_components/contact-form-page';
import { CompanyUserContactController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { setFlashMessage } from '~/lib/flash-message.server';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 2). */
export const handle: FormPageHandle = { formPage: true };

const emptyValues: ContactFormData = {
  givenName: '',
  familyName: '',
  email: '',
  mobileNumber: '',
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return data({
    values: emptyValues,
    returnTo: url.searchParams.get('returnTo'),
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const returnTo = String(formData.get('returnTo') ?? '') || null;
  const values: ContactFormData = {
    givenName: String(formData.get('givenName') ?? '').trim(),
    familyName: String(formData.get('familyName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    mobileNumber: String(formData.get('mobileNumber') ?? '').trim(),
  };

  const parsed = ContactFormSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as keyof ContactFormData | undefined;
      if (path) fieldErrors[path] = issue.message;
    }
    const error = 'Kontroller feltene og prøv igjen.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error, fieldErrors, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
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

    return redirect(returnTo || ROUTES_MAP['company.admin.contacts'].href);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke opprette kontakt');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyAdminContactsCreatePage({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <ContactFormPage mode="create" values={loaderData.values} actionData={actionData} returnTo={loaderData.returnTo} />
  );
}
