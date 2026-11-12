import { useEffect, useRef, useState } from 'react';
import { Form, useActionData, useNavigation } from 'react-router';
import { Upload } from 'lucide-react';
import type { BookingProfileDto, DailyScheduleDto, GroupedServiceGroupDto } from '~/api/generated';
import { StartEndTimeSelector } from '~/components/pickers/start-end-time-selector';
import { BOOKING_AREAS } from '../../_utils/booking-areas';
import { Button, Checkbox, CompanyFormPageTemplate, Label, Textarea, categoryTone, cn, PageNotice } from '~/ui';

type BookingProfileFormProps = {
  mode: 'create' | 'edit';
  section?: 'profile' | 'services' | 'schedule';
  bookingProfile: BookingProfileDto | null;
  groupedServiceGroups: GroupedServiceGroupDto[];
  loaderError: string | null;
};

const DAYS: [DailyScheduleDto['dayOfWeek'], string][] = [
  ['MONDAY', 'Mandag'],
  ['TUESDAY', 'Tirsdag'],
  ['WEDNESDAY', 'Onsdag'],
  ['THURSDAY', 'Torsdag'],
  ['FRIDAY', 'Fredag'],
  ['SATURDAY', 'Lørdag'],
  ['SUNDAY', 'Søndag'],
];

export function BookingProfileForm({
  mode,
  section = 'profile',
  bookingProfile,
  groupedServiceGroups,
  loaderError,
}: BookingProfileFormProps) {
  const navigation = useNavigation();
  const actionData = useActionData<{ fieldErrors?: Record<string, string> }>();
  const fieldErrors = actionData?.fieldErrors ?? {};
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(bookingProfile?.image?.url ?? null);
  const [activeDays, setActiveDays] = useState(
    () => new Set(bookingProfile?.dailySchedule.map((day) => day.dayOfWeek) ?? []),
  );
  const [scheduleTimes, setScheduleTimes] = useState<Record<string, { start: string; end: string }>>(() =>
    Object.fromEntries(
      DAYS.map(([day]) => {
        const schedule = bookingProfile?.dailySchedule.find((value) => value.dayOfWeek === day);
        return [
          day,
          { start: schedule?.startTime.slice(0, 5) ?? '09:00', end: schedule?.endTime.slice(0, 5) ?? '17:00' },
        ];
      }),
    ),
  );
  const selectedServices = new Set(
    bookingProfile?.services.flatMap((group) => group.services.map((service) => service.id)) ?? [],
  );
  const openDayCount = activeDays.size;
  const weeklyHours = DAYS.reduce((total, [day]) => {
    const schedule = bookingProfile?.dailySchedule.find((value) => value.dayOfWeek === day);
    if (!activeDays.has(day) || !schedule) return total;
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    return total + Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
  }, 0);
  const profileTone = categoryTone(BOOKING_AREAS.find((area) => area.key === 'profile')!.tone);
  const initials = [bookingProfile?.familyName, bookingProfile?.givenName]
    .map((name) => name?.charAt(0) ?? '')
    .join('');
  const title =
    mode === 'create'
      ? 'Opprett bookingprofil'
      : { profile: 'Rediger profil', services: 'Rediger tjenester', schedule: 'Rediger arbeidstider' }[section];

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(removeImage ? null : (bookingProfile?.image?.url ?? null));
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile, removeImage, bookingProfile?.image?.url]);

  return (
    <CompanyFormPageTemplate
      title={title}
      notices={loaderError ? <PageNotice title="Kunne ikke hente bookingprofil" /> : null}
      submit={{
        form: 'booking-profile-form',
        loading: navigation.state === 'submitting',
        disabled: Boolean(loaderError),
      }}
    >
      <Form
        id="booking-profile-form"
        method="post"
        encType={section === 'profile' ? 'multipart/form-data' : 'application/x-www-form-urlencoded'}
        className="space-y-5"
      >
        {section === 'profile' ? (
          <>
            <h2 className="text-base font-semibold">Profil</h2>
            <div className="space-y-2">
              <Label htmlFor="imageFile">Profilbilde (valgfritt)</Label>
              <div className="flex flex-wrap items-center gap-4">
                <span
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold',
                    profileTone.tint,
                    profileTone.ink,
                  )}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profilbilde" className="size-full object-cover" />
                  ) : (
                    <span aria-hidden>{initials}</span>
                  )}
                </span>
                <input
                  ref={imageInput}
                  id="imageFile"
                  name="imageFile"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    setImageFile(file);
                    if (file) setRemoveImage(false);
                  }}
                />
                <Button type="button" variant="outline" onClick={() => imageInput.current?.click()}>
                  <Upload className="size-4" aria-hidden />
                  Last opp bilde
                </Button>
                {imagePreview ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-danger-text"
                    onClick={() => {
                      setRemoveImage(true);
                      setImageFile(null);
                      if (imageInput.current) imageInput.current.value = '';
                    }}
                  >
                    Fjern bilde
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse (valgfritt)</Label>
              <Textarea id="description" name="description" defaultValue={bookingProfile?.description ?? ''} />
            </div>
            <input type="hidden" name="removeImage" value={String(removeImage)} />
          </>
        ) : section === 'services' ? (
          <>
            <h2 className="text-base font-semibold">Tjenester</h2>
            <div>
              {groupedServiceGroups.length === 0 ? (
                <p className="py-4 text-sm text-text-secondary">Ingen tjenester</p>
              ) : null}
              {groupedServiceGroups.map((group, index) => {
                const tone = categoryTone(index);
                return (
                  <fieldset key={group.id}>
                    <legend
                      className={cn(
                        'flex w-full items-center gap-2 border-y border-border px-4 py-2 text-xs font-semibold',
                        tone.tint,
                      )}
                    >
                      <span className={cn('size-2 rounded-full', tone.dot)} aria-hidden />
                      {group.name}
                    </legend>
                    <div className="divide-y divide-border">
                      {group.services.map((service) => (
                        <label key={service.id} className="flex min-h-15 items-center gap-3 px-4 py-2">
                          <Checkbox
                            name="services[]"
                            value={service.id}
                            defaultChecked={selectedServices.has(service.id)}
                            className="size-5 shrink-0 accent-interactive"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{service.name}</span>
                            <span className="block text-sm text-text-secondary">ca. {service.duration} min</span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">ca. {service.price} kr</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-semibold">Arbeidstider</h2>
                <p className="mt-1 text-sm text-text-secondary">Åpningstidene kundene kan bestille</p>
              </div>
              <span className="shrink-0 text-sm text-text-secondary">{openDayCount} dager åpne</span>
            </div>
            <div className="divide-y divide-border">
              {DAYS.map(([day, label]) => {
                const schedule = bookingProfile?.dailySchedule.find((value) => value.dayOfWeek === day);
                const active = activeDays.has(day);
                const error = fieldErrors[day];
                return (
                  <div
                    key={day}
                    className={cn(
                      'grid grid-cols-2 items-center gap-x-3 gap-y-2 py-3 md:grid-cols-[10rem_1fr_1fr] md:gap-x-4',
                      !active && 'text-text-secondary',
                    )}
                  >
                    <label className="col-span-2 flex min-h-11 items-center gap-3 text-sm font-semibold md:col-span-1 md:pt-6">
                      <Checkbox
                        name="days"
                        value={day}
                        aria-label={label}
                        checked={active}
                        className="size-5 accent-interactive"
                        onCheckedChange={(checked) =>
                          setActiveDays((current) => {
                            const next = new Set(current);
                            if (checked) next.add(day);
                            else next.delete(day);
                            return next;
                          })
                        }
                      />
                      {label}
                      {!active ? (
                        <span className="ml-auto text-xs font-normal text-text-placeholder md:hidden">Stengt</span>
                      ) : null}
                    </label>
                    {active ? (
                      <div className="col-span-2 space-y-1.5 md:col-span-2">
                        <div className="grid grid-cols-2 gap-3">
                          <Label className="text-sm font-semibold text-text-primary">Fra</Label>
                          <Label className="text-sm font-semibold text-text-primary">Til</Label>
                        </div>
                        <StartEndTimeSelector
                          startName={`${day}-start`}
                          endName={`${day}-end`}
                          startValue={scheduleTimes[day]?.start ?? '09:00'}
                          endValue={scheduleTimes[day]?.end ?? '17:00'}
                          onStartChange={(next) =>
                            setScheduleTimes((current) => ({
                              ...current,
                              [day]: { ...current[day], start: next },
                            }))
                          }
                          onEndChange={(next) =>
                            setScheduleTimes((current) => ({
                              ...current,
                              [day]: { ...current[day], end: next },
                            }))
                          }
                          startPlaceholder="Fra"
                          endPlaceholder="Til"
                          startLabel={`${label} — Fra`}
                          endLabel={`${label} — Til`}
                          className="grid grid-cols-2 gap-3"
                        />
                      </div>
                    ) : (
                      <span className="hidden text-sm text-text-placeholder md:block">Stengt</span>
                    )}
                    {error ? (
                      <p id={`${day}-error`} className="col-span-2 text-sm text-danger-text md:col-start-2">
                        {error}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-pink-50 px-3 py-2.5 text-sm">
              <span>
                <span className="font-semibold text-pink-800">Ukesplan</span>
                <span className="text-text-secondary">
                  {' '}
                  · {weeklyHours % 1 === 0 ? weeklyHours : weeklyHours.toFixed(1)} timer
                </span>
              </span>
              <span className="text-text-secondary">{openDayCount ? `${openDayCount} dager` : 'Ingen dager'}</span>
            </div>
          </>
        )}
      </Form>
    </CompanyFormPageTemplate>
  );
}
