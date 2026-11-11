import { useEffect, useState } from 'react';
import { Form, useNavigation, useSubmit } from 'react-router';
import { Check, ChevronsUpDown } from 'lucide-react';
import { fileToBase64 } from '~/lib/file.utils';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { ImagesField, type ImageField } from '~/routes/company/_components/images-field';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { Button, CompanyFormPageTemplate, FormField, Label, Popover, PopoverContent, PopoverTrigger, cn } from '~/ui';

export type ServiceOption = {
  id: number;
  name: string;
};

export type ServiceFormValues = {
  id?: number;
  name: string;
  serviceGroupId: number;
  price: number;
  duration: number;
  images: ImageField[];
};

type ServiceFormPageProps = {
  mode: 'create' | 'edit';
  values: ServiceFormValues;
  serviceGroups: ServiceOption[];
  actionData?: {
    error?: string;
    values?: Omit<ServiceFormValues, 'images'>;
  } | null;
};

export function ServiceFormPage({ mode, values, serviceGroups, actionData }: ServiceFormPageProps) {
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSaving = navigation.state === 'submitting' && navigation.formData?.get('intent') !== 'delete';
  const isEdit = mode === 'edit';
  const currentValues = actionData?.values ? { ...values, ...actionData.values, images: values.images } : values;
  const [serviceGroupId, setServiceGroupId] = useState(String(currentValues.serviceGroupId));
  const [images, setImages] = useState<ImageField[]>(currentValues.images);
  const [isServiceGroupPopoverOpen, setIsServiceGroupPopoverOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isDeleting = navigation.state !== 'idle' && navigation.formData?.get('intent') === 'delete';

  const handleDeleteConfirm = () => {
    if (!currentValues.id) return;
    const formData = new FormData();
    formData.append('intent', 'delete');
    formData.append('id', String(currentValues.id));
    submit(formData, { method: 'post' });
    setIsDeleteDialogOpen(false);
  };

  useEffect(() => {
    setServiceGroupId(String(currentValues.serviceGroupId));
  }, [currentValues.serviceGroupId]);

  useEffect(() => {
    setImages(currentValues.images);
  }, [currentValues.images]);

  const selectedServiceGroup = serviceGroups.find((serviceGroup) => String(serviceGroup.id) === serviceGroupId) ?? null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const htmlForm = event.currentTarget;
    const formData = new FormData(htmlForm);
    formData.set('serviceGroupId', serviceGroupId);

    const imagesToDelete = images.filter((image) => image.pendingDeletion && image.id).map((image) => image.id!);
    for (const imageId of imagesToDelete) {
      formData.append('deleteImageIds', String(imageId));
    }

    const imagesToUpload = images.filter((image) => image.file && !image.pendingDeletion);

    for (const [index, image] of imagesToUpload.entries()) {
      const base64 = await fileToBase64(image.file!);
      formData.append(`images[${index}][fileName]`, image.file!.name);
      formData.append(`images[${index}][contentType]`, image.file!.type || 'application/octet-stream');
      formData.append(`images[${index}][label]`, image.label ?? '');
      formData.append(`images[${index}][data]`, base64);
    }

    submit(formData, { method: 'post' });
  };

  return (
    <CompanyFormPageTemplate
      title={isEdit ? currentValues.name || 'Rediger tjeneste' : 'Ny tjeneste'}
      submit={{ form: 'service-form', loading: isSaving }}
    >
      <Form id="service-form" method="post" onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="intent" value={isEdit ? 'update' : 'create'} />
        {currentValues.id ? <input type="hidden" name="id" value={currentValues.id} /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            label="Navn"
            name="name"
            defaultValue={currentValues.name}
            placeholder="F.eks. Hårklipp"
            required
          />

          <div className="flex flex-col gap-2">
            <Label>Gruppe</Label>
            <Popover open={isServiceGroupPopoverOpen} onOpenChange={setIsServiceGroupPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full justify-between border-field-border bg-background font-normal sm:h-10"
                >
                  <span className={cn(!selectedServiceGroup && 'text-text-secondary')}>
                    {selectedServiceGroup?.name ?? 'Velg gruppe'}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-full p-2">
                <div className="space-y-1">
                  {serviceGroups.map((serviceGroup) => {
                    const isSelected = String(serviceGroup.id) === serviceGroupId;

                    return (
                      <button
                        key={serviceGroup.id}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition-colors',
                          isSelected ? 'bg-surface text-text-primary' : 'text-text-primary hover:bg-surface',
                        )}
                        onClick={() => {
                          setServiceGroupId(String(serviceGroup.id));
                          setIsServiceGroupPopoverOpen(false);
                        }}
                      >
                        <span>{serviceGroup.name}</span>
                        {isSelected ? <Check className="h-4 w-4 text-interactive" /> : null}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Two short numbers: side by side on phones too. */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Pris (kr)"
            name="price"
            type="number"
            min={0}
            defaultValue={String(currentValues.price)}
            placeholder="0"
          />

          <FormField
            label="Varighet (min)"
            name="duration"
            type="number"
            min={1}
            defaultValue={String(currentValues.duration)}
            placeholder="30"
          />
        </div>

        <div className="space-y-3">
          <Label>Bilder</Label>
          <ImagesField images={images} onChange={setImages} />
        </div>
      </Form>

      {/* Delete lives here, not in the list: rare and destructive, so a quiet red text button at the bottom. */}
      {isEdit && currentValues.id ? (
        <div className="flex justify-end border-t border-border pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setIsDeleteDialogOpen(true)}
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-interactive disabled:opacity-50 lg:min-h-10"
          >
            Slett tjeneste
          </button>
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={`Slett ${currentValues.name || 'tjenesten'}?`}
        description="Dette kan ikke angres."
        confirmText="Slett tjeneste"
      />
    </CompanyFormPageTemplate>
  );
}
