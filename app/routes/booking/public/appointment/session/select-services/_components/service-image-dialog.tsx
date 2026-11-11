import type { GroupedServiceDto } from '~/api/generated';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/ui';

type ServiceImageDialogProps = {
  service: GroupedServiceDto | null;
  onClose: () => void;
};

export function ServiceImageDialog({ service, onClose }: ServiceImageDialogProps) {
  return (
    <Dialog open={service !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        {service ? (
          <>
            <DialogHeader className="border-b border-booking-border p-4">
              <DialogTitle className="text-base font-bold text-booking-text md:text-lg">{service.name}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-booking-text-muted">
                {service.images?.length} {service.images?.length === 1 ? 'bilde' : 'bilder'}
              </DialogDescription>
            </DialogHeader>

            {service.images && service.images.length > 0 ? (
              <div className="p-4">
                <Carousel className="w-full">
                  <CarouselContent>
                    {service.images.map((image, index) => (
                      <CarouselItem key={image.id ?? index}>
                        <div className="flex justify-center">
                          <div className="relative w-full max-w-xl overflow-hidden rounded-[var(--radius-booking-panel)]">
                            <img
                              src={image.url}
                              alt={image.label || `${service.name} - Bilde ${index + 1}`}
                              className="h-64 w-full object-cover md:h-96"
                            />

                            {image.label ? (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                <p className="text-sm font-medium text-white">{image.label}</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>

                  {service.images.length > 1 ? (
                    <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>
                  ) : null}
                </Carousel>
              </div>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
