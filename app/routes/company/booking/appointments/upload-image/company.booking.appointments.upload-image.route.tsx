import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { data, useNavigation, useSubmit } from 'react-router';
import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_QUERY_TIMEZONE } from '~/lib/query';
import { nb } from 'date-fns/locale';
import { Camera, X, ZoomIn, ZoomOut } from 'lucide-react';
import { CompanyUserAppointmentController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { fileToBase64 } from '~/lib/file.utils';
import type { Route } from './+types/company.booking.appointments.upload-image.route';
import { Button, cn, CompanyPageTemplate, Dialog, DialogContent, DialogTitle, Notice, PageNotice } from '~/ui';
import type { UpHandle } from '~/lib/routing/up-link';

/** Up is the appointment the image belongs to (ui-rules → Page top). */
export const handle: UpHandle = {
  up: (loaderData) => {
    const appointmentId = (loaderData as { appointmentId?: number | null } | undefined)?.appointmentId;
    if (!appointmentId) return null;
    return {
      label: 'Timebestilling',
      href: ROUTES_MAP['company.booking.appointments.detail'].href.replace(':appointmentId', String(appointmentId)),
    };
  },
};

const EDITOR_SIZE = 280;
const OUTPUT_SIZE = 1024;

const parseAppointmentIdFromUrl = (url: string): number | null => {
  const value = new URL(url).searchParams.get('id');
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export async function loader({ request }: Route.LoaderArgs) {
  const appointmentId = parseAppointmentIdFromUrl(request.url);

  if (!appointmentId) {
    return data(
      {
        appointmentId: null,
        appointment: null,
        error: 'Mangler eller ugyldig avtale-ID.',
      },
      { status: 400 },
    );
  }

  try {
    const response = await withAuth(request, async () =>
      // Company endpoint: the backend checks the appointment belongs to the signed-in user's company.
      CompanyUserAppointmentController.getAppointmentById1({
        path: { id: appointmentId },
      }),
    );

    return data({
      appointmentId,
      appointment: response.data?.data ?? null,
      error: null,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente avtaledetaljer');
    return data(
      {
        appointmentId,
        appointment: null,
        error: message,
      },
      { status: 400 },
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  const appointmentId = parseAppointmentIdFromUrl(request.url);

  if (!appointmentId) {
    return data({ success: false, message: 'Mangler eller ugyldig avtale-ID.' }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? 'upload');

  if (intent === 'delete-image') {
    const imageId = Number(formData.get('imageId'));

    if (!Number.isInteger(imageId) || imageId <= 0) {
      return data({ success: false, message: 'Ugyldig bilde-ID.' }, { status: 400 });
    }

    try {
      await withAuth(request, async () =>
        CompanyUserAppointmentController.deleteAppointmentImage({
          path: {
            id: appointmentId,
            imageId,
          },
        }),
      );

      return data({ success: true, message: 'Bildet ble fjernet.', intent: 'delete-image' });
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke fjerne bilde');
      return data({ success: false, message, intent: 'delete-image' }, { status: 400 });
    }
  }

  const fileName = String(formData.get('fileName') ?? '').trim();
  const contentType = String(formData.get('contentType') ?? '').trim();
  const dataValue = String(formData.get('data') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();

  if (!fileName || !contentType || !dataValue) {
    return data({ success: false, message: 'Velg et bilde og juster det før opplasting.' }, { status: 400 });
  }

  try {
    await withAuth(request, async () =>
      CompanyUserAppointmentController.uploadAppointmentImage({
        path: { id: appointmentId },
        body: {
          image: {
            fileName,
            contentType,
            data: dataValue,
            label,
          },
        },
      }),
    );

    return data({ success: true, message: 'Bildet ble lastet opp.', intent: 'upload' });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke laste opp bilde');
    return data({ success: false, message, intent: 'upload' }, { status: 400 });
  }
}

type ImageMeta = {
  naturalWidth: number;
  naturalHeight: number;
};

export default function CompanyBookingAppointmentUploadImagePage({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const submit = useSubmit();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [viewedImageUrl, setViewedImageUrl] = useState<string | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const appointment = loaderData.appointment;
  const existingImages = appointment?.images ?? [];
  const submittingIntent = navigation.formData?.get('intent')?.toString();
  const isUploading = navigation.state === 'submitting' && submittingIntent === 'upload';
  const deletingImageId =
    navigation.state === 'submitting' && submittingIntent === 'delete-image'
      ? Number(navigation.formData?.get('imageId'))
      : null;

  const previewSize = useMemo(() => {
    if (!imageMeta) return null;
    const fit = Math.min(EDITOR_SIZE / imageMeta.naturalWidth, EDITOR_SIZE / imageMeta.naturalHeight);
    return {
      width: imageMeta.naturalWidth * fit,
      height: imageMeta.naturalHeight * fit,
    };
  }, [imageMeta]);

  const setNewFile = (file: File | null) => {
    if (!file) return;

    setSelectedFile(file);
    setOffset({ x: 0, y: 0 });
    setScale(1);
    setImageMeta(null);

    const url = URL.createObjectURL(file);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(url);

    const image = new Image();
    image.onload = () => {
      setImageMeta({
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
    };
    image.src = url;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!imagePreviewUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;

    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;

    setOffset({
      x: dragStateRef.current.originX + deltaX,
      y: dragStateRef.current.originY + deltaY,
    });
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
  };

  const resetEditor = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedFile(null);
    setImagePreviewUrl(null);
    setImageMeta(null);
    setOffset({ x: 0, y: 0 });
    setScale(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (actionData?.success && 'intent' in actionData && actionData.intent === 'upload') {
      resetEditor();
    }
  }, [actionData]);

  const handleUpload = async () => {
    if (!selectedFile || !imageMeta) return;

    const normalizedFile = await renderNormalizedImage({
      file: selectedFile,
      imageMeta,
      scale,
      offset,
      editorSize: EDITOR_SIZE,
      outputSize: OUTPUT_SIZE,
      appointmentId: loaderData.appointmentId,
    });

    const encoded = await fileToBase64(normalizedFile);
    const formData = new FormData();
    formData.append('intent', 'upload');
    formData.append('fileName', normalizedFile.name);
    formData.append('contentType', normalizedFile.type || 'image/jpeg');
    formData.append('data', encoded);

    submit(formData, { method: 'post' });
  };

  const handleDeleteImage = (imageId: number) => {
    const formData = new FormData();
    formData.append('intent', 'delete-image');
    formData.append('imageId', String(imageId));
    submit(formData, { method: 'post' });
  };

  return (
    <CompanyPageTemplate title="Last opp bilde">
      {loaderData.error ? <PageNotice title="Kunne ikke hente avtale" /> : null}

      {appointment ? (
        <section aria-label="Bilder" className="w-full max-w-[32rem] space-y-2">
          <p className="text-sm text-text-secondary">
            {[appointment.user.givenName, appointment.user.familyName].filter(Boolean).join(' ')} ·{' '}
            {formatInTimeZone(appointment.startTime, DEFAULT_QUERY_TIMEZONE, 'EEE d. MMM · HH:mm', { locale: nb })}
          </p>

          <div className="rounded-xl border border-border bg-background p-3">
            {imagePreviewUrl ? (
              <div className="space-y-3">
                <div
                  className="relative mx-auto touch-none overflow-hidden rounded-xl bg-black"
                  style={{ width: EDITOR_SIZE, height: EDITOR_SIZE }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  {previewSize ? (
                    <img
                      src={imagePreviewUrl}
                      alt="Bildet som justeres"
                      onDragStart={(event) => event.preventDefault()}
                      className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                      style={{
                        width: previewSize.width * scale,
                        height: previewSize.height * scale,
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      }}
                    />
                  ) : null}
                  {/* Guide: drag and zoom until the head sits inside the circle. */}
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-white/80"
                    aria-hidden
                  />
                </div>

                <div className="mx-auto flex max-w-[280px] items-center gap-3 text-text-secondary">
                  <ZoomOut className="h-4 w-4 shrink-0" aria-hidden />
                  <input
                    type="range"
                    aria-label="Zoom"
                    min={1}
                    max={3}
                    step={0.01}
                    value={scale}
                    onChange={(event) => setScale(Number(event.currentTarget.value))}
                    className="w-full accent-[var(--color-interactive)]"
                  />
                  <ZoomIn className="h-4 w-4 shrink-0" aria-hidden />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={resetEditor} disabled={isUploading}>
                    Avbryt
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpload}
                    loading={isUploading}
                    disabled={isUploading || !imageMeta}
                  >
                    Lagre bilde
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-3 gap-2">
                {existingImages.map((image, index) => (
                  <li
                    key={image.id ?? `${image.url}-${index}`}
                    className={cn('relative aspect-square', deletingImageId === image.id && 'opacity-50')}
                  >
                    <button
                      type="button"
                      aria-label={`Vis bilde ${index + 1}`}
                      onClick={() => setViewedImageUrl(image.url)}
                      className="block h-full w-full overflow-hidden rounded-[var(--radius-control)] bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
                    >
                      <img
                        src={image.url}
                        alt={`Avtalebilde ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                    <button
                      type="button"
                      aria-label={`Fjern bilde ${index + 1}`}
                      disabled={!image.id || deletingImageId === image.id}
                      onClick={() => image.id && handleDeleteImage(image.id)}
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-text-secondary shadow-sm transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                <li className="aspect-square">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border-2 border-dashed border-border px-2 text-center text-xs font-medium sm:text-sm text-interactive transition-colors hover:border-interactive/50 hover:bg-surface-variant-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
                  >
                    <Camera className="h-5 w-5" aria-hidden />
                    Legg til bilde
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* One picker: phones offer camera or photo library from here. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => setNewFile(event.currentTarget.files?.[0] ?? null)}
          />

          {actionData && !actionData.success ? (
            <Notice tone="emphasis" title="Noe gikk galt" message={actionData.message} />
          ) : null}
        </section>
      ) : null}

      <Dialog open={!!viewedImageUrl} onOpenChange={(open) => !open && setViewedImageUrl(null)}>
        <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Bilde</DialogTitle>
          {viewedImageUrl ? (
            <img src={viewedImageUrl} alt="Avtalebilde" className="max-h-[80vh] w-full rounded-lg object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </CompanyPageTemplate>
  );
}

type RenderNormalizedImageArgs = {
  file: File;
  imageMeta: ImageMeta;
  scale: number;
  offset: { x: number; y: number };
  editorSize: number;
  outputSize: number;
  appointmentId: number | null;
};

async function renderNormalizedImage({
  file,
  imageMeta,
  scale,
  offset,
  editorSize,
  outputSize,
  appointmentId,
}: RenderNormalizedImageArgs): Promise<File> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Kunne ikke opprette tegneflate for bildebehandling.');
    }

    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, outputSize, outputSize);

    const fitRatio = Math.min(outputSize / imageMeta.naturalWidth, outputSize / imageMeta.naturalHeight);
    const drawWidth = imageMeta.naturalWidth * fitRatio * scale;
    const drawHeight = imageMeta.naturalHeight * fitRatio * scale;

    const centerX = outputSize / 2 + (offset.x * outputSize) / editorSize;
    const centerY = outputSize / 2 + (offset.y * outputSize) / editorSize;

    const x = centerX - drawWidth / 2;
    const y = centerY - drawHeight / 2;

    context.drawImage(image, x, y, drawWidth, drawHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error('Kunne ikke kode bildet.'));
            return;
          }
          resolve(result);
        },
        'image/jpeg',
        0.88,
      );
    });

    const fileName = `appointment-${appointmentId ?? 'image'}-${Date.now()}.jpg`;
    return new File([blob], fileName, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Kunne ikke lese bildet.'));
    image.src = url;
  });
}
