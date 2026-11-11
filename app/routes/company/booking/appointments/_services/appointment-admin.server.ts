import { AuthController, CompanyUserAppointmentController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { authService } from '~/lib/auth-service';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';

/** Only company admins may mark "ikke møtt"; the backend enforces it too, this just hides the button. */
export async function isBookingAdmin(request: Request): Promise<boolean> {
  try {
    const session = await authService.getUserSession(request);
    const response = await withAuth(request, () => AuthController.getPermissions());
    const permissions = response.data?.data;
    return Boolean(
      session.user.companyId &&
        permissions?.companyId === session.user.companyId &&
        permissions.companyRoles?.includes('ADMIN'),
    );
  } catch {
    return false;
  }
}

/** Handles the `no-show` form intent shared by the list and detail pages. */
export async function setNoShowFromForm(request: Request, formData: FormData) {
  const id = Number(formData.get('id'));
  const noShow = formData.get('noShow') === 'true';

  if (!Number.isInteger(id) || id <= 0) {
    return redirectWithError(request, request.url, 'Mangler ID');
  }

  try {
    await withAuth(request, () =>
      CompanyUserAppointmentController.setAppointmentNoShow({ path: { id }, body: { noShow } }),
    );
    return redirectWithSuccess(request, request.url, noShow ? 'Markert som ikke møtt' : 'Ikke møtt er angret');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke oppdatere timen');
    return redirectWithError(request, request.url, message);
  }
}
