import { data, redirect, Form, Link, useNavigation } from 'react-router';
import type { Route } from './+types/booking.public.appointment.session.employee.route';
import { ROUTES_MAP } from '~/lib/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { cn } from '@/lib/utils';
import {
  BookingContainer,
  BookingStepHeader,
  BookingGrid,
  BookingButton,
  SelectableCard,
  BookingSummary,
  BookingSection,
} from '../../_components/booking-layout';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { PublicAppointmentSessionController } from '~/api/generated/booking';
import { requireAuthenticatedBookingFlow } from '../_utils/require-authenticated-booking-flow.server';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const guardResult = await requireAuthenticatedBookingFlow(request);
    if (guardResult instanceof Response) {
      return guardResult;
    }
    const { session } = guardResult;

    // Allow users to return and change their profile selection
    // Don't auto-forward redirect - users should be able to edit previous steps

    const profilesResponse = await PublicAppointmentSessionController.getAppointmentSessionProfiles({
      query: {
        sessionId: session.sessionId,
      },
    });

    return data({
      session,
      profiles: profilesResponse.data?.data || [],
      selectedProfileId: session.selectedProfileId,
      error: null as string | null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente frisører');
    return data(
      {
        profiles: [],
        selectedProfileId: null,
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const guardResult = await requireAuthenticatedBookingFlow(request);
    if (guardResult instanceof Response) {
      return guardResult;
    }
    const { session } = guardResult;

    const formData = await request.formData();
    const selectedProfileId = formData.get('selectedProfileId') as string;

    await PublicAppointmentSessionController.selectAppointmentSessionProfile({
      query: {
        sessionId: session.sessionId,
        selectedProfileId: Number(selectedProfileId),
      },
    });

    return redirect(ROUTES_MAP['booking.public.appointment.session.select-services'].href);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke velge frisør');
    return data(
      {
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

export default function AppointmentsEmployee({ loaderData }: Route.ComponentProps) {
  const profiles = loaderData.profiles ?? [];
  const selectedProfileId = loaderData.selectedProfileId;
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const submittingProfileId = navigation.formData?.get('selectedProfileId');

  if (loaderData.error) {
    return (
      <BookingContainer>
        <BookingStepHeader
          label="Velg frisør"
          title="Hvem skal vi bestille avtalen på?"
          description={loaderData.error}
        />
      </BookingContainer>
    );
  }

  return (
    <>
      <BookingContainer>
        <BookingStepHeader
          label="Velg behandler"
          title="Hvem skal vi bestille avtalen på?"
          description={
            selectedProfileId
              ? 'Du har allerede valgt en frisør. Du kan endre valget eller fortsette.'
              : 'Velg en frisør for å fortsette med timebestilling'
          }
          className="mb-4 md:mb-5"
        />

        <BookingSection>
          <BookingGrid cols={2}>
            {profiles.map((profile) => {
              const isSelected = selectedProfileId === profile.id;
              const isSubmittingProfile =
                isSubmitting && submittingProfileId !== null && String(profile.id) === String(submittingProfileId);

              return (
                <SelectableCard
                  key={profile.id}
                  selected={isSelected}
                  className={cn(
                    'flex h-full min-h-[260px] flex-col',
                    isSelected && 'border-primary',
                    isSubmittingProfile && 'border-primary bg-primary/10',
                  )}
                >
                  {isSelected && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valgt frisør</p>
                  )}

                  <div className="flex min-h-[84px] items-start gap-3">
                    {profile.image && (
                      <div className="border border-border bg-muted w-16 h-16 flex-shrink-0">
                        <img
                          src={profile.image.url}
                          alt={`${profile.givenName} ${profile.familyName}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-foreground">
                        {profile.givenName} {profile.familyName}
                      </h2>
                      {profile.description && (
                        <p className="text-xs text-muted-foreground mt-1">{profile.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border py-4">
                    {profile.services.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                          >
                            Vis tjenester
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 rounded-none border border-border bg-background p-4">
                          <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                            {profile.services.map((group) => (
                              <div key={group.id} className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  {group.name}
                                </div>
                                <div className="space-y-2">
                                  {group.services.map((service) => (
                                    <div key={service.id} className="flex items-baseline justify-between gap-2">
                                      <span className="text-sm text-foreground">{service.name}</span>
                                      <div className="flex items-baseline gap-2 flex-shrink-0">
                                        <span className="text-xs text-muted-foreground">{service.duration} min</span>
                                        <span className="text-sm font-medium text-foreground">{service.price} kr</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  <div className="mt-auto border-t border-border pt-4">
                    {isSelected ? (
                      <BookingButton type="button" variant="outline" fullWidth disabled>
                        Valgt
                      </BookingButton>
                    ) : (
                      <Form method="post">
                        <input type="hidden" name="selectedProfileId" value={profile.id} />
                        <BookingButton type="submit" fullWidth loading={isSubmittingProfile} disabled={isSubmitting}>
                          Velg {profile.givenName}
                        </BookingButton>
                      </Form>
                    )}
                  </div>
                </SelectableCard>
              );
            })}
          </BookingGrid>
        </BookingSection>
      </BookingContainer>

      <BookingSummary
        mobile={{
          items: [
            {
              label: 'Valgt frisør',
              value: selectedProfile ? `${selectedProfile.givenName} ${selectedProfile.familyName}` : 'Ikke valgt',
            },
          ],
          primaryAction: selectedProfileId ? (
            <Link to={ROUTES_MAP['booking.public.appointment.session.select-services'].href}>
              <BookingButton variant="primary" size="lg" fullWidth>
                Fortsett
              </BookingButton>
            </Link>
          ) : (
            <BookingButton variant="primary" size="lg" fullWidth disabled>
              Velg frisør
            </BookingButton>
          ),
          secondaryAction: (
            <Link to={ROUTES_MAP['booking.public.appointment.session.contact'].href}>
              <BookingButton type="button" variant="outline" size="md" fullWidth>
                Tilbake
              </BookingButton>
            </Link>
          ),
        }}
      />
    </>
  );
}
