import { AuthController, type UserAuthStatusDto } from '~/api/generated/identity';
import { AppointmentSessionService } from '../../_services/appointment-session.service.server';
import { authService } from '~/lib/auth-service';
import { resolveErrorPayload } from '~/lib/api-error';
import { VerificationTokenService } from './verification-token.service.server';
import { withAuth } from '~/api/utils/with-auth';

export type ContactSessionContext = {
  session: Awaited<ReturnType<typeof AppointmentSessionService.get>>;
  sessionUser: UserAuthStatusDto | null;
  auth: Awaited<ReturnType<typeof authService.getAuth>>;
  verificationSessionToken: string | null;
};

export class ContactSessionService {
  static async getSessionUserStatus(request: Request): Promise<UserAuthStatusDto | null> {
    try {
      return await withAuth(request, async () => {
        const response = await AuthController.userStatus();
        const status = response?.data?.data || null;
        return status;
      });
    } catch (error) {
      console.warn('[contact-session] Failed to get user status', {
        error: resolveErrorPayload(error, 'Kunne ikke hente brukerdata'),
      });
      return null;
    }
  }

  static async getContactContext(request: Request): Promise<ContactSessionContext> {
    const session = await AppointmentSessionService.get(request);
    const sessionUser = await this.getSessionUserStatus(request);
    const auth = await authService.getAuth(request);
    const verificationSessionToken = await VerificationTokenService.readVerificationToken(request);

    return {
      session,
      sessionUser,
      auth,
      verificationSessionToken,
    };
  }
}
