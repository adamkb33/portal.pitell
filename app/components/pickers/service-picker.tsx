import { useState } from 'react';
import { Badge, Button } from '~/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '~/components/ui/carousel';
import type { GroupedServiceDto, GroupedServiceGroupDto, ImageDto } from '~/api/generated';

export type ServicePickerProps = {
  groupedServices: GroupedServiceGroupDto[];
  initialSelectedIds?: number[];
  onSubmit: (serviceIds: number[]) => void;
  isSubmitting?: boolean;
};

export function ServicePicker({
  groupedServices,
  initialSelectedIds = [],
  onSubmit,
  isSubmitting = false,
}: ServicePickerProps) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(initialSelectedIds);
  const [dialogService, setDialogService] = useState<GroupedServiceDto | null>(null);

  const toggleService = (serviceId: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedServiceIds);
  };

  const handleOpenImages = (service: GroupedServiceDto) => {
    if (!service.images || service.images.length === 0) return;
    setDialogService(service);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) setDialogService(null);
  };

  const renderServiceImagesCarousel = (images: ImageDto[], serviceName: string) => {
    if (images.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <div className="border border-border bg-muted">
          <Carousel className="w-full">
            <CarouselContent>
              {images.map((image) => (
                <CarouselItem key={image.id ?? image.url} className="flex justify-center">
                  <div className="w-full max-w-xl overflow-hidden border border-border bg-background">
                    <img
                      src={image.url}
                      alt={image.label || serviceName}
                      loading="lazy"
                      className="h-64 w-full object-cover"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {images.length > 1 && (
              <>
                <CarouselPrevious className="border border-border bg-background" />
                <CarouselNext className="border border-border bg-background" />
              </>
            )}
          </Carousel>
        </div>

        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          {images.map((image) => (
            <span key={`meta-${image.id ?? image.url}`} className="border border-border px-2 py-0.5">
              {image.label ?? serviceName}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-5 border border-border bg-background p-4 sm:p-5">
          <div className="space-y-5">
            {groupedServices
              .filter((group) => group.services.length > 0)
              .map((group) => (
                <section key={group.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                  <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {group.name}
                  </h4>

                  <div className="flex flex-wrap gap-2.5">
                    {group.services.map((service) => {
                      const selected = selectedServiceIds.includes(service.id);
                      const hasImages = !!service.images && service.images.length > 0;

                      return (
                        <div key={service.id} className="flex flex-col items-start gap-1">
                          <Button
                            variant={selected ? 'primary' : 'outline'}
                            size="sm"
                            type="button"
                            onClick={() => toggleService(service.id)}
                            disabled={isSubmitting}
                            className={[
                              'border border-border px-3 py-2 text-xs font-medium',
                              'rounded-none bg-background transition-colors',
                              selected ? 'bg-foreground text-background' : 'text-foreground',
                            ].join(' ')}
                          >
                            <span className="flex flex-col items-start gap-0.5 text-left sm:flex-row sm:items-center sm:gap-3">
                              <span>{service.name}</span>
                              <span className="text-xs font-normal text-muted-foreground">
                                {service.price} kr · {service.duration} min
                              </span>
                            </span>
                          </Button>

                          {hasImages && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleOpenImages(service)}
                              disabled={isSubmitting}
                              className="px-0 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                            >
                              Vis bilder
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>

          {selectedServiceIds.length > 0 && (
            <div className="border-t border-border pt-4">
              <h5 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Valgte tjenester
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {groupedServices.flatMap((group) =>
                  group.services
                    .filter((s) => selectedServiceIds.includes(s.id))
                    .map((s) => (
                      <Badge
                        key={s.id}
                        variant="secondary"
                        className="rounded-none border border-border bg-background px-2.5 py-0.5 text-xs font-medium"
                      >
                        {s.name}
                      </Badge>
                    )),
                )}
              </div>
            </div>
          )}
        </div>

        <Button type="submit" className="h-9 w-full text-sm" disabled={isSubmitting || selectedServiceIds.length === 0}>
          {isSubmitting ? 'Lagrer...' : 'Bekreft valg'}
        </Button>
      </form>

      <Dialog open={dialogService != null} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl rounded-none border border-border bg-background px-4 py-5 sm:px-6 sm:py-6">
          {dialogService && (
            <>
              <DialogHeader className="mb-3 border-b border-border pb-3">
                <DialogTitle className="text-sm font-medium">{dialogService.name}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Bilder for denne tjenesten.
                </DialogDescription>
              </DialogHeader>
              {dialogService.images && renderServiceImagesCarousel(dialogService.images, dialogService.name)}{' '}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
