import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { AppointmentDto } from '~/api/generated';
import { Badge, Card, CardContent, Text } from '~/ui';
import { getTotalDuration } from '../_utils/appointments.utils';

type SpotlightTone = 'ongoing' | 'recent' | 'upcoming';

type SpotlightAppointmentCardProps = {
  title: string;
  hint: string;
  appointment: AppointmentDto;
  tone: SpotlightTone;
  onOpen: (appointment: AppointmentDto) => void;
};

const toneClasses: Record<SpotlightTone, { card: string; chip: string; bar: string; orb: string; inner: string }> = {
  ongoing: {
    card: 'border-primary/30 bg-surface-primary-subtle',
    chip: 'border-primary/30 bg-surface-primary-strong text-primary',
    bar: 'bg-primary/85',
    orb: 'bg-primary/20',
    inner: 'bg-background/80',
  },
  recent: {
    card: 'border-tertiary/35 bg-surface-tertiary-subtle',
    chip: 'border-tertiary/35 bg-surface-tertiary-strong text-tertiary',
    bar: 'bg-tertiary/80',
    orb: 'bg-tertiary/20',
    inner: 'bg-background/75',
  },
  upcoming: {
    card: 'border-secondary/35 bg-surface-secondary-subtle',
    chip: 'border-secondary/35 bg-surface-secondary-strong text-secondary',
    bar: 'bg-secondary/80',
    orb: 'bg-secondary/20',
    inner: 'bg-background/78',
  },
};

export function SpotlightAppointmentCard({ title, hint, appointment, tone, onOpen }: SpotlightAppointmentCardProps) {
  return (
    <Card className={`relative overflow-hidden rounded-xl ${toneClasses[tone].card}`}>
      <div className={`h-1 w-full ${toneClasses[tone].bar}`} />
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-xl ${toneClasses[tone].orb}`}
      />
      <CardContent className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <Text as="p" variant="body-sm" className="font-semibold">
            {title}
          </Text>
          <Badge variant="outline" size="sm" className={`rounded-full text-[11px] ${toneClasses[tone].chip}`}>
            {hint}
          </Badge>
        </div>

        <button
          type="button"
          onClick={() => onOpen(appointment)}
          className={`w-full rounded-lg border border-border p-2.5 text-left transition-all hover:border-primary/40 hover:shadow-sm ${toneClasses[tone].inner}`}
        >
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <Text as="p" variant="body-sm" className="truncate font-semibold">
                {appointment.user.givenName} {appointment.user.familyName}
              </Text>
              <Text as="p" variant="caption" className="text-text-secondary">
                {format(parseISO(appointment.startTime), "EEE d. MMM 'kl.' HH:mm", { locale: nb })}
              </Text>
            </div>
            <div className="text-right text-xs">
              <Text as="p" variant="caption" className="text-text-secondary">
                Varighet
              </Text>
              <Text as="p" variant="caption" className="font-semibold text-text-primary">
                {getTotalDuration(appointment)}
              </Text>
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
  );
}
