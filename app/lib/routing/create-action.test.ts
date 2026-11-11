import { describe, expect, it } from 'vitest';
import { isFormPage, resolveCreateAction } from './create-action';

const newAppointment = { label: 'Bestill ny avtale', to: '/company/booking/appointments/create' };
const newService = { label: 'Ny tjeneste', to: '/company/booking/admin/services/create' };

describe('resolveCreateAction', () => {
  it('gives nothing when no route declares a create action', () => {
    expect(resolveCreateAction([])).toBeNull();
    expect(resolveCreateAction([{ handle: undefined }, { handle: {} }])).toBeNull();
  });

  it("uses the list page's own action", () => {
    expect(resolveCreateAction([{ handle: {} }, { handle: { createAction: newService } }])).toEqual(newService);
  });

  it('stops below the list page: a detail page under it offers nothing', () => {
    expect(resolveCreateAction([{ handle: { createAction: newAppointment } }, { handle: {} }])).toBeNull();
    expect(resolveCreateAction([{ handle: { createAction: newAppointment } }, {}])).toBeNull();
  });

  it("ignores a parent's action even when the page declares its own", () => {
    expect(
      resolveCreateAction([{ handle: { createAction: newAppointment } }, { handle: { createAction: newService } }]),
    ).toEqual(newService);
  });

  it("computes the action from the page's own loader data", () => {
    const handle = {
      createAction: (data: unknown) => ((data as { canCreate: boolean }).canCreate ? newService : null),
    };
    expect(resolveCreateAction([{ handle, loaderData: { canCreate: true } }])).toEqual(newService);
    expect(resolveCreateAction([{ handle, loaderData: { canCreate: false } }])).toBeNull();
  });
});

describe('isFormPage', () => {
  it('is true when any matched route is a form page', () => {
    expect(isFormPage([{ handle: {} }, { handle: { formPage: true } }])).toBe(true);
    expect(isFormPage([{ handle: { createAction: newService } }, {}])).toBe(false);
  });
});
