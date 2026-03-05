import { data, redirect, Form, useNavigation, Link } from 'react-router';
import type { Route } from './+types/booking.public.appointment.session.select-services.route';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Search, X, Clock, DollarSign, Check, Image as ImageIcon, ShoppingBag, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '~/components/ui/carousel';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import {
  PublicAppointmentSessionController,
  type GroupedServiceGroupDto,
  type GroupedServiceDto,
} from '~/api/generated/booking';
import { ROUTES_MAP } from '~/lib/route-tree';
import {
  BookingContainer,
  BookingButton,
  BookingStepHeader,
  SelectableCard,
  BookingSummary,
  BookingErrorBanner,
} from '../../_components/booking-layout';
import { resolveErrorPayload } from '~/lib/api-error';
import { requireAuthenticatedBookingFlow } from '../_utils/require-authenticated-booking-flow.server';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const guardResult = await requireAuthenticatedBookingFlow(request);
    if (guardResult instanceof Response) {
      return guardResult;
    }
    const { session } = guardResult;

    const serviceGroupsResponse = await PublicAppointmentSessionController.getAppointmentSessionProfileServices({
      query: {
        sessionId: session.sessionId,
      },
    });

    return data({
      session,
      serviceGroups: serviceGroupsResponse.data?.data || [],
      error: null as string | null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente tjenester');
    return data(
      {
        session: null,
        serviceGroups: [],
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
    const selectedServices = formData.getAll('serviceId').map(Number);

    await PublicAppointmentSessionController.selectAppointmentSessionProfileServices({
      query: {
        sessionId: session.sessionId,
        selectedServiceIds: selectedServices,
      },
    });

    return redirect(ROUTES_MAP['booking.public.appointment.session.select-time'].href);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke lagre tjenestevalg');
    return data(
      {
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

/* ========================================
   SERVICE CARD - Interactive, visual feedback
   ======================================== */

interface ServiceCardProps {
  service: GroupedServiceDto;
  isSelected: boolean;
  onToggle: () => void;
  onViewImages?: () => void;
}

function ServiceCard({ service, isSelected, onToggle, onViewImages }: ServiceCardProps) {
  const hasImages = service.images && service.images.length > 0;
  const previewImage = hasImages ? service.images && service.images[0] : null;

  return (
    <SelectableCard
      selected={isSelected}
      onClick={onToggle}
      className={cn('group relative overflow-hidden transition-all', isSelected && 'ring-2 ring-primary ring-offset-2')}
    >
      {/* Image Preview */}
      {previewImage && (
        <div className="relative -mx-3 -mt-3 mb-3 h-32 overflow-hidden md:-mx-4 md:-mt-4 md:mb-4 md:h-40">
          <img
            src={previewImage.url}
            alt={service.name}
            className="size-full object-cover transition-transform group-hover:scale-105"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Image count badge */}
          {service.images && service.images.length > 1 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm">
              <ImageIcon className="size-3 text-white" />
              <span className="text-xs font-semibold text-white">{service.images.length}</span>
            </div>
          )}

          {/* Selected checkmark */}
          {isSelected && (
            <div className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-full bg-primary shadow-lg">
              <Check className="size-5 text-primary-foreground" strokeWidth={3} />
            </div>
          )}
        </div>
      )}

      {/* Service Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 text-base font-bold text-card-text md:text-lg">{service.name}</h3>

          {!previewImage && isSelected && (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary">
              <Check className="size-4 text-primary-foreground" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Price & Duration */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <DollarSign className="size-4" />
            <span>{service.price} kr</span>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-4" />
            <span>{service.duration} min</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2 border-t border-card-border pt-3">
        {hasImages && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewImages?.();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-card-border bg-card-accent/5 px-3 py-2 text-sm font-medium transition-colors hover:bg-card-accent/10"
          >
            <ImageIcon className="size-4" />
            <span className="hidden sm:inline">Vis bilder</span>
            <span className="sm:hidden">Bilder</span>
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
            isSelected
              ? 'border-2 border-primary bg-primary/10 text-primary hover:bg-primary/20'
              : 'border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {isSelected ? (
            <>
              <Check className="size-4" strokeWidth={3} />
              Valgt
            </>
          ) : (
            <>Velg</>
          )}
        </button>
      </div>
    </SelectableCard>
  );
}

/* ========================================
   SERVICE GROUP - Collapsible section
   ======================================== */

interface ServiceGroupProps {
  group: GroupedServiceGroupDto;
  selectedServices: Set<number>;
  onToggleService: (serviceId: number) => void;
  onViewImages: (service: GroupedServiceDto) => void;
}

function ServiceGroup({ group, selectedServices, onToggleService, onViewImages }: ServiceGroupProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedInGroup = group.services.filter((s) => selectedServices.has(s.id)).length;

  const handleAccordionChange = (nextValue: string | undefined) => {
    if (nextValue) {
      requestAnimationFrame(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  return (
    <div ref={containerRef}>
      <Accordion
        type="single"
        collapsible
        onValueChange={handleAccordionChange}
        className="rounded-lg border border-card-border bg-card"
      >
        <AccordionItem value={String(group.id)} className="border-none">
          <div className="flex items-start gap-3 px-3 py-3 md:px-4 md:py-4">
            <AccordionTrigger className="flex-1 p-0 text-left hover:no-underline">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-card-text md:text-lg">{group.name}</h2>
                  {selectedInGroup > 0 && (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                      {selectedInGroup} valgt
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                  {group.services.length} {group.services.length === 1 ? 'tjeneste' : 'tjenester'}
                </p>
              </div>
            </AccordionTrigger>
          </div>
          <AccordionContent className="border-t border-card-border p-3 md:p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5">
              {group.services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isSelected={selectedServices.has(service.id)}
                  onToggle={() => onToggleService(service.id)}
                  onViewImages={() => onViewImages(service)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/* ========================================
   MAIN COMPONENT
   ======================================== */

export default function BookingPublicAppointmentSessionSelectServicesRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const serviceGroups = loaderData.serviceGroups ?? [];
  const session = loaderData.session;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogService, setDialogService] = useState<GroupedServiceDto | null>(null);

  useEffect(() => {
    if (session?.selectedServices) {
      setSelectedServices(new Set(session.selectedServices));
    }
  }, [session]);

  if (loaderData.error || !session) {
    return (
      <BookingContainer>
        <BookingStepHeader title="Velg tjenester" description={loaderData.error ?? 'Ugyldig økt'} />
      </BookingContainer>
    );
  }

  // Service lookup helpers
  const findService = (serviceId: number): GroupedServiceDto | undefined => {
    for (const group of serviceGroups) {
      const service = group.services.find((s) => s.id === serviceId);
      if (service) return service;
    }
    return undefined;
  };

  // Filter service groups by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return serviceGroups;

    const query = searchQuery.toLowerCase();
    return serviceGroups
      .map((group) => ({
        ...group,
        services: group.services.filter((service) => service.name.toLowerCase().includes(query)),
      }))
      .filter((group) => group.services.length > 0);
  }, [serviceGroups, searchQuery]);

  // Selection handlers
  const toggleService = (serviceId: number) => {
    setSelectedServices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  // Calculate totals
  const selectedServicesList = useMemo(() => {
    return Array.from(selectedServices)
      .map(findService)
      .filter((s): s is GroupedServiceDto => s !== undefined);
  }, [selectedServices]);

  const totalDuration = selectedServicesList.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = selectedServicesList.reduce((sum, s) => sum + s.price, 0);
  const hasSelections = selectedServices.size > 0;

  // Total service count
  const totalServices = serviceGroups.reduce((sum, g) => sum + g.services.length, 0);

  return (
    <>
      <BookingContainer>
        {/* ========================================
            PAGE HEADER
            ======================================== */}
        <BookingStepHeader
          label="Velg tjenester"
          title="Hvilke tjenester ønsker du?"
          description={`Velg én eller flere tjenester fra ${totalServices} tilgjengelige tjenester.`}
        />

        {loaderData.error && <BookingErrorBanner title={loaderData.error} />}
        {actionData?.error && <BookingErrorBanner title={actionData.error} />}

        <div>
          {/* ========================================
              SEARCH BAR - For many services
              ======================================== */}
          {totalServices > 6 && (
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Search className="size-5 text-muted-foreground" />
              </div>

              <input
                type="text"
                placeholder="Søk etter tjenester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full rounded-lg border border-card-border bg-card pl-11 pr-11 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-muted"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* ========================================
              SERVICE GROUPS
              ======================================== */}
          <div className="space-y-4 md:space-y-5">
            {filteredGroups.length > 0 ? (
              filteredGroups
                .filter((group) => group.services.length > 0)
                .map((group) => (
                  <ServiceGroup
                    key={group.id}
                    group={group}
                    selectedServices={selectedServices}
                    onToggleService={toggleService}
                    onViewImages={setDialogService}
                  />
                ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-card-border bg-card-accent/5 py-12 text-center">
                <Search className="size-12 text-muted-foreground opacity-50" />
                <p className="mt-4 text-base font-medium text-card-text">Ingen tjenester funnet</p>
                <p className="mt-1 text-sm text-muted-foreground">Prøv et annet søkeord</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                >
                  Tilbakestill søk
                </button>
              </div>
            )}
          </div>
        </div>
      </BookingContainer>

      <BookingSummary
        show
        mobile={{
          title: 'Oppsummering',
          items: hasSelections
            ? [
                {
                  label: 'Tjenester',
                  value: `${selectedServices.size} ${selectedServices.size === 1 ? 'tjeneste' : 'tjenester'}`,
                  icon: <ShoppingBag className="size-4" />,
                },
                { label: 'Varighet', value: `${totalDuration} min` },
                { label: 'Pris', value: `${totalPrice} kr` },
              ]
            : [
                {
                  label: 'Tjenester',
                  value: 'Velg tjenester',
                  icon: <ShoppingBag className="size-4" />,
                },
              ],
          primaryAction: (
            <Form method="post">
              {Array.from(selectedServices).map((serviceId) => (
                <input key={serviceId} type="hidden" name="serviceId" value={serviceId} />
              ))}
              <BookingButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting}
                disabled={!hasSelections || isSubmitting}
              >
                <Sparkles className="size-5" />
                Fortsett til tidspunkt
              </BookingButton>
            </Form>
          ),
          secondaryAction: (
            <Link to={ROUTES_MAP['booking.public.appointment.session.employee'].href}>
              <BookingButton type="button" variant="outline" size="md" fullWidth>
                Tilbake
              </BookingButton>
            </Link>
          ),
        }}
        desktopClassName="sticky top-4 rounded-lg border border-card-border bg-card p-4"
      />
      {/* ========================================
          IMAGE DIALOG - Mobile-optimized
          ======================================== */}
      <Dialog open={dialogService !== null} onOpenChange={(open) => !open && setDialogService(null)}>
        <DialogContent className="max-w-3xl gap-0 p-0">
          {dialogService && (
            <>
              <DialogHeader className="border-b border-card-border p-4 md:p-6">
                <DialogTitle className="text-base font-bold text-card-text md:text-lg">
                  {dialogService.name}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {dialogService.images?.length} {dialogService.images?.length === 1 ? 'bilde' : 'bilder'}
                </DialogDescription>
              </DialogHeader>

              {dialogService.images && dialogService.images.length > 0 && (
                <div className="p-4 md:p-6">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {dialogService.images.map((image, index) => (
                        <CarouselItem key={image.id ?? index}>
                          <div className="flex justify-center">
                            <div className="relative w-full max-w-xl overflow-hidden rounded-lg">
                              <img
                                src={image.url}
                                alt={image.label || `${dialogService.name} - Bilde ${index + 1}`}
                                className="h-64 w-full object-cover md:h-96"
                              />

                              {image.label && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                  <p className="text-sm font-medium text-white">{image.label}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>

                    {dialogService.images.length > 1 && (
                      <>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                      </>
                    )}
                  </Carousel>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
