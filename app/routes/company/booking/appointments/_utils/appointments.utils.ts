import { OSLO_TZ } from '~/lib/oslo-time';
import type { AppointmentDto } from '~/api/generated';

export const isAppointmentCompleted = (appointment: Pick<AppointmentDto, 'startTime'>, now: Date = new Date()) => {
  return new Date(appointment.startTime) < now;
};

export const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString('nb-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: OSLO_TZ,
  });
};

export const getTotalPrice = (appointment: AppointmentDto) => {
  const allServices = appointment.groupedServiceGroups?.flatMap((group) => group.services ?? []) ?? [];
  const total = allServices.reduce((sum, service) => sum + (service.price ?? 0), 0);
  return total.toLocaleString('nb-NO', { style: 'currency', currency: 'NOK' });
};

export const getTotalDuration = (appointment: AppointmentDto) => {
  const allServices = appointment.groupedServiceGroups?.flatMap((group) => group.services ?? []) ?? [];
  const total = allServices.reduce((sum, service) => sum + (service.duration ?? 0), 0);
  return `${total} min`;
};

/** Numeric totals for display. Price and duration are estimates, so format them with the estimate helpers. */
export const getAppointmentTotals = (appointment: AppointmentDto) => {
  const services = appointment.groupedServiceGroups?.flatMap((group) => group.services ?? []) ?? [];
  return {
    services,
    duration: services.reduce((sum, service) => sum + (service.duration ?? 0), 0),
    price: services.reduce((sum, service) => sum + (service.price ?? 0), 0),
  };
};

export const isAppointmentInProgress = (appointment: Pick<AppointmentDto, 'startTime' | 'endTime'>, now: Date) =>
  new Date(appointment.startTime) <= now && now <= new Date(appointment.endTime);

export const getTotalServiceCount = (appointment: AppointmentDto) => {
  return appointment.groupedServiceGroups?.reduce((sum, group) => sum + (group.services?.length ?? 0), 0) ?? 0;
};
