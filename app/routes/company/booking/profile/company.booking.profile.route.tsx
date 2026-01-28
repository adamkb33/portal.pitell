// routes/company/booking/profile/route.tsx
import { useFetcher } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { User, Briefcase, CalendarDays, Image as ImageIcon } from 'lucide-react';
import { FormDialog } from '~/components/dialog/form-dialog';
import { fileToBase64 } from '~/lib/file.utils';
import { createImageUploadRenderer } from '~/components/dialog/create-image-upload-renderer';
import { createServicesSelectionRenderer } from '~/components/dialog/create-services-rendrer';
import type { DailyScheduleDto } from '~/api/generated/booking';

import type { Route } from './+types/company.booking.profile.route';
import { CompanyUserBookingProfileController, CompanyUserServiceGroupController } from '~/api/generated/booking';
import { API_ROUTES_MAP } from '~/lib/route-tree';
import { withAuth } from '~/api/utils/with-auth';
import { createDailyScheduleRenderer } from '~/components/dialog/create-daily-schedule-renderer';
import { resolveErrorPayload } from '~/lib/api-error';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';

const DAY_ABBREV: Record<string, string> = {
  MONDAY: 'Mandag',
  TUESDAY: 'Tirsdag',
  WEDNESDAY: 'Onsdag',
  THURSDAY: 'Torsdag',
  FRIDAY: 'Fredag',
  SATURDAY: 'Lørdag',
  SUNDAY: 'Søndag',
};

const DAY_ORDER: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const [bookingProfileResponse, groupedServiceGroupsResponse] = await withAuth(request, async () => {
      return Promise.all([
        CompanyUserBookingProfileController.getBookingProfile(),
        CompanyUserServiceGroupController.getGroupedServiceGroups(),
      ]);
    });

    return {
      bookingProfile: bookingProfileResponse.data,
      groupedServiceGroups: groupedServiceGroupsResponse.data?.data ?? [],
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente bookingprofil');
    return {
      bookingProfile: undefined,
      groupedServiceGroups: [],
      error: message,
    };
  }
}

export default function BookingCompanyUserProfile({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<{ success?: boolean; message?: string }>();

  const { bookingProfile, groupedServiceGroups = [] } = loaderData;

  const [createOrUpdateDialogOpen, setCreateOrUpdateBookingProfileDialogOpen] = useState(false);
  const [createOrUpdateDialogForm, setCreateOrUpdateDialogForm] = useState({
    description: '',
    services: [] as number[],
    dailySchedules: [] as DailyScheduleDto[],
    image: null as { file: File; previewUrl: string } | null,
  });

  useEffect(() => {
    if (createOrUpdateDialogOpen && bookingProfile) {
      // Extract individual service IDs from all service groups
      const serviceIds =
        bookingProfile.services?.flatMap((group: any) => group.services.map((service: any) => service.id)) || [];

      setCreateOrUpdateDialogForm({
        description: bookingProfile.description || '',
        services: serviceIds,
        dailySchedules: bookingProfile.dailySchedule || [],
        image: null,
      });
    } else if (createOrUpdateDialogOpen && !bookingProfile) {
      setCreateOrUpdateDialogForm({
        description: '',
        services: [],
        dailySchedules: [],
        image: null,
      });
    }
  }, [createOrUpdateDialogOpen, bookingProfile]);

  const handleFieldChange = (name: keyof typeof createOrUpdateDialogForm, value: any) => {
    setCreateOrUpdateDialogForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGetOrCreateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append('description', createOrUpdateDialogForm.description);

      // Services
      for (const serviceId of createOrUpdateDialogForm.services) {
        formData.append('services[]', String(serviceId));
      }

      // Daily schedules
      if (createOrUpdateDialogForm.dailySchedules.length > 0) {
        formData.append('dailySchedules', JSON.stringify(createOrUpdateDialogForm.dailySchedules));
      }

      // Handle image action
      if (createOrUpdateDialogForm.image?.file) {
        formData.append('imageAction', 'UPLOAD');
        const base64Data = await fileToBase64(createOrUpdateDialogForm.image.file);
        formData.append('imageData[fileName]', createOrUpdateDialogForm.image.file.name);
        formData.append(
          'imageData[contentType]',
          createOrUpdateDialogForm.image.file.type || 'application/octet-stream',
        );
        formData.append('imageData[data]', base64Data);
        formData.append('imageData[label]', createOrUpdateDialogForm.image.file.name);
      }

      fetcher.submit(formData, {
        method: 'post',
        action: API_ROUTES_MAP['company.booking.profile.create-or-update'].url,
      });
      setCreateOrUpdateBookingProfileDialogOpen(false);
    } catch (error) {
      console.error('Failed to submit booking profile:', error);
    }
  };

  const handleEditBookingProfile = () => {
    setCreateOrUpdateBookingProfileDialogOpen(true);
  };

  const renderImageUpload = createImageUploadRenderer({
    existingImageUrl: bookingProfile?.image?.url || null,
    helperText: bookingProfile?.image?.url
      ? 'Last opp et nytt bilde for å erstatte det eksisterende.'
      : 'Last opp et profilbilde som vises til kunder.',
  });

  const renderServicesSelection = createServicesSelectionRenderer({ services: groupedServiceGroups });

  const renderDailySchedule = createDailyScheduleRenderer({
    helperText: 'Velg hvilke dager og klokkeslett du er tilgjengelig for bookinger.',
  });

  const dialogTitle = bookingProfile ? 'Rediger bookingprofil' : 'Lag bookingprofil';
  const dialogSubmitLabel = bookingProfile ? 'Lagre endringer' : 'Opprett';

  const profileName =
    bookingProfile?.familyName && bookingProfile?.givenName
      ? `${bookingProfile.familyName} ${bookingProfile.givenName}`
      : 'Bookingprofil';

  const hasProfileImage = Boolean(bookingProfile?.image?.url);
  const hasDescription = Boolean(bookingProfile?.description?.trim());
  const hasServices = Boolean(bookingProfile?.services && bookingProfile.services.length > 0);
  const hasDailySchedule = Boolean(bookingProfile?.dailySchedule && bookingProfile.dailySchedule.length > 0);

  const totalServices = bookingProfile?.services?.reduce((acc, group) => acc + (group.services?.length ?? 0), 0) ?? 0;
  const totalServiceGroups = bookingProfile?.services?.length ?? 0;
  const scheduleSlots = bookingProfile?.dailySchedule?.length ?? 0;
  const availabilityDays = new Set(bookingProfile?.dailySchedule?.map((day) => day.dayOfWeek) ?? []).size;

  const sortedDailySchedule = useMemo(() => {
    if (!bookingProfile?.dailySchedule) return [];
    return [...bookingProfile.dailySchedule].sort((a, b) => DAY_ORDER[a.dayOfWeek] - DAY_ORDER[b.dayOfWeek]);
  }, [bookingProfile?.dailySchedule]);

  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
  };

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[320px,1fr] gap-4">
        <div className="space-y-4">
          <Card variant="elevated">
            <CardHeader className="border-b">
              <CardTitle>Profilforhåndsvisning</CardTitle>
              <CardDescription>Slik ser profilen ut for kunder.</CardDescription>
              <div className="flex justify-end">
                <Button onClick={handleEditBookingProfile}>
                  {bookingProfile ? 'Rediger bookingprofil' : 'Legg til bookingprofil'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                {hasProfileImage ? (
                  <img
                    src={bookingProfile?.image?.url ?? ''}
                    alt={profileName}
                    className="h-14 w-14 rounded-full object-cover border border-primary/30"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <span className="text-xl font-semibold text-primary">{profileName.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{profileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalServices} tjenester · {availabilityDays} tilgjengelige dager
                  </p>
                </div>
              </div>

              {hasDescription ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{bookingProfile?.description}</p>
              ) : (
                <div className="rounded-lg border border-muted/50 bg-muted/30 p-3 text-xs text-muted-foreground">
                  Legg til en beskrivelse for å gjøre profilen mer personlig.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/30 p-2.5">
                  <p className="text-xs text-muted-foreground">Tjenestegrupper</p>
                  <p className="text-base font-semibold text-foreground">{totalServiceGroups}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2.5">
                  <p className="text-xs text-muted-foreground">Tidsluker</p>
                  <p className="text-base font-semibold text-foreground">{scheduleSlots}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                {hasProfileImage ? 'Profilbilde er lagt til.' : 'Ingen profilbilde enda.'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card variant="elevated">
            <CardHeader className="border-b">
              <CardTitle>Oversikt</CardTitle>
              <CardDescription>En rask oppsummering av profilen.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-lg bg-muted/30 p-2.5">
                  <p className="text-xs text-muted-foreground">Tjenester</p>
                  <p className="text-lg font-semibold text-foreground">{totalServices}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2.5">
                  <p className="text-xs text-muted-foreground">Tjenestegrupper</p>
                  <p className="text-lg font-semibold text-foreground">{totalServiceGroups}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2.5">
                  <p className="text-xs text-muted-foreground">Dager tilgjengelig</p>
                  <p className="text-lg font-semibold text-foreground">{availabilityDays}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2.5">
                  <p className="text-xs text-muted-foreground">Tidsluker</p>
                  <p className="text-lg font-semibold text-foreground">{scheduleSlots}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Accordion type="multiple" className="space-y-3">
            <AccordionItem value="description" className="bg-accordion-bg">
              <Card variant="bordered">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-foreground">Om deg</h3>
                      <p className="text-sm text-muted-foreground">Gi kundene et inntrykk av profilen.</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {hasDescription ? (
                    <div className="rounded-lg bg-muted/30 p-3 text-sm text-foreground leading-relaxed">
                      {bookingProfile?.description}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
                      Legg til en beskrivelse for å øke tillit og konvertering.
                    </div>
                  )}
                </AccordionContent>
              </Card>
            </AccordionItem>

            <AccordionItem value="services" className="bg-accordion-bg">
              <Card variant="bordered">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-foreground">Tjenester</h3>
                      <p className="text-sm text-muted-foreground">
                        {totalServices} tjenester fordelt på {totalServiceGroups} grupper.
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {hasServices ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      {bookingProfile?.services?.map((group) => (
                        <div key={group.id} className="rounded-lg border border-card-border bg-muted/30 p-3">
                          <p className="text-sm font-semibold text-foreground">{group.name}</p>
                          <div className="mt-2 space-y-2">
                            {group.services.map((service) => (
                              <div key={service.id} className="flex items-center justify-between text-xs">
                                <span className="text-foreground">{service.name}</span>
                                <span className="text-muted-foreground">
                                  {service.duration} min · <span className="font-semibold">kr {service.price}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-muted/50 bg-muted/30 p-3 text-sm text-muted-foreground">
                      Legg til tjenester slik at kundene vet hva de kan bestille.
                    </div>
                  )}
                </AccordionContent>
              </Card>
            </AccordionItem>

            <AccordionItem value="schedule" className="bg-accordion-bg">
              <Card variant="bordered">
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-chart-3" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-foreground">Arbeidstider</h3>
                      <p className="text-sm text-muted-foreground">Vis når du er tilgjengelig.</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {hasDailySchedule ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {sortedDailySchedule.map((day) => (
                        <div
                          key={day.id}
                          className="flex items-center justify-between rounded-lg border border-card-border bg-muted/30 px-3 py-2.5"
                        >
                          <span className="text-sm font-medium text-foreground">{DAY_ABBREV[day.dayOfWeek]}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeRange(day.startTime, day.endTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-muted/50 bg-muted/30 p-3 text-sm text-muted-foreground">
                      Sett opp arbeidstider for å la kunder booke tider.
                    </div>
                  )}
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <FormDialog
        open={createOrUpdateDialogOpen}
        onOpenChange={setCreateOrUpdateBookingProfileDialogOpen}
        title={dialogTitle}
        fields={[
          {
            name: 'image',
            label: 'Profilbilde',
            render: renderImageUpload,
          },
          {
            name: 'description',
            label: 'Beskrivelse',
            type: 'textarea',
            placeholder: 'Fortell kunder om dine spesialiteter, arbeidsområder eller andre relevante detaljer...',
            description: 'Denne beskrivelsen vil være synlig for kunder.',
            className: 'min-h-[120px]',
          },
          {
            name: 'services',
            label: 'Tjenester',
            render: renderServicesSelection,
            description: 'Velg hvilke tjenester du tilbyr.',
          },
          {
            name: 'dailySchedules',
            label: 'Arbeidstider',
            render: renderDailySchedule,
            description: 'Sett dine tilgjengelige dager og klokkeslett.',
          },
        ]}
        formData={createOrUpdateDialogForm}
        onFieldChange={handleFieldChange}
        onSubmit={handleGetOrCreateProfileSubmit}
        actions={[
          {
            label: 'Avbryt',
            variant: 'outline',
            onClick: () => setCreateOrUpdateBookingProfileDialogOpen(false),
          },
          {
            label: dialogSubmitLabel,
            variant: 'default',
            type: 'submit',
          },
        ]}
      />
    </>
  );
}
