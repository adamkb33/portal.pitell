import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_QUERY_TIMEZONE } from '~/lib/query';
import { nb } from 'date-fns/locale';
import {
  getTotalDuration,
  getTotalPrice,
  getTotalServiceCount,
  isAppointmentCompleted,
} from '../_utils/appointments.utils';
import type { AppointmentDto } from '~/api/generated';
import { Badge, Button, TableCell, TableRow } from '~/ui';

type AppointmentTableRowProps = {
  appointment: AppointmentDto;
  onOpen: (appointment: AppointmentDto) => void;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
};

export function AppointmentTableRow({ appointment, onOpen, onDelete, isDeleting = false }: AppointmentTableRowProps) {
  const isCompleted = isAppointmentCompleted(appointment);
  const totalServices = getTotalServiceCount(appointment);

  return (
    <TableRow
      className="cursor-pointer transition-colors hover:bg-surface/60 focus-within:bg-surface/60"
      onClick={() => onOpen(appointment)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(appointment);
        }
      }}
      tabIndex={0}
      aria-label="Vis avtaledetaljer"
    >
      <TableCell className="py-4 align-top">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold leading-tight">
            {formatInTimeZone(appointment.startTime, DEFAULT_QUERY_TIMEZONE, 'HH:mm', { locale: nb })}
          </span>
          <span className="text-sm text-text-secondary">
            {formatInTimeZone(appointment.startTime, DEFAULT_QUERY_TIMEZONE, 'd. MMM yyyy', { locale: nb })}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <span className="text-sm font-medium">
          {appointment.user.givenName} {appointment.user.familyName}
        </span>
      </TableCell>

      <TableCell>
        <span className="text-sm text-text-primary">
          {totalServices} {totalServices === 1 ? 'tjeneste' : 'tjenester'}
        </span>
      </TableCell>

      <TableCell>
        <span className="text-sm">{getTotalDuration(appointment)}</span>
      </TableCell>

      <TableCell>
        {appointment.loyaltyFreeVisit ? (
          <div className="flex flex-col items-start gap-1">
            <Badge variant="success" size="sm">
              Gratis besøk
            </Badge>
            <span className="text-xs text-text-secondary line-through">{getTotalPrice(appointment)}</span>
          </div>
        ) : (
          <span className="text-sm font-semibold text-primary">{getTotalPrice(appointment)}</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(appointment.id!);
            }}
            disabled={isDeleting || isCompleted}
            title={isCompleted ? 'Fullførte avtaler kan ikke slettes' : undefined}
          >
            Slett
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
