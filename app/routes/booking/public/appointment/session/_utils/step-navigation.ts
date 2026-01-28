import type { AppointmentSessionDto } from '~/api/generated/booking';

/**
 * Booking Step Configuration
 */
export interface BookingStep {
  id: string;
  routeId: string;
  routePath: string;
  order: number;
  name: string;
  description?: string;
  isRequired: boolean;
}

/**
 * Enhanced step status with navigation logic
 *
 * State Flags:
 * - isComplete: Step has been completed
 * - isCurrent: User is currently on this step
 * - isAccessible: User can navigate to this step
 *
 * Navigation Flags:
 * - canNavigateBack: User can go back from this step
 * - canNavigateForward: User can proceed to next step
 */
export interface EnhancedStepStatus extends BookingStep {
  // State
  isComplete: boolean;
  isCurrent: boolean;
  isAccessible: boolean;

  // Navigation capabilities
  canNavigateBack: boolean;
  canNavigateForward: boolean;
}

/**
 * Helper functions for common step state checks
 */
export const StepHelpers = {
  /**
   * Step is complete and not current (shows checkmark)
   */
  isPastStep: (step: EnhancedStepStatus): boolean => step.isComplete && !step.isCurrent,

  /**
   * Step is accessible but not started (shows as future step)
   */
  isFutureAccessibleStep: (step: EnhancedStepStatus): boolean =>
    step.isAccessible && !step.isCurrent && !step.isComplete,

  /**
   * Step is locked (not accessible yet)
   */
  isLockedStep: (step: EnhancedStepStatus): boolean => !step.isAccessible,

  /**
   * Step is optional (derived from isRequired)
   */
  isOptional: (step: EnhancedStepStatus): boolean => !step.isRequired,

  /**
   * Step can be clicked/navigated to
   */
  isClickable: (step: EnhancedStepStatus): boolean => step.isAccessible && !step.isCurrent,
};

/**
 * Step definitions matching your route tree structure
 */
export const BOOKING_STEPS: BookingStep[] = [
  {
    id: 'contact',
    routeId: 'booking.public.appointment.session.contact',
    routePath: 'contact',
    order: 1,
    name: 'Bruker',
    description: 'Logg inn for å fortsette',
    isRequired: true,
  },
  {
    id: 'employee',
    routeId: 'booking.public.appointment.session.employee',
    routePath: 'employee',
    order: 2,
    name: 'Velg behandler',
    description: 'Velg ønsket behandler',
    isRequired: true,
  },
  {
    id: 'select-services',
    routeId: 'booking.public.appointment.session.select-services',
    routePath: 'select-services',
    order: 3,
    name: 'Velg tjenester',
    description: 'Velg tjenester du ønsker',
    isRequired: true,
  },
  {
    id: 'select-time',
    routeId: 'booking.public.appointment.session.select-time',
    routePath: 'select-time',
    order: 4,
    name: 'Velg tidspunkt',
    description: 'Velg dato og tid for avtalen',
    isRequired: true,
  },
  {
    id: 'overview',
    routeId: 'booking.public.appointment.session.overview',
    routePath: 'overview',
    order: 5,
    name: 'Oversikt',
    description: 'Bekreft din timebestilling',
    isRequired: true,
  },
];

/**
 * Determines step status based on session data and current location
 *
 * Navigation Rules:
 * - Users can only access steps up to their furthest completed step + 1
 * - Users can always navigate backwards to completed steps
 * - Current step is always accessible
 */
export function getEnhancedStepStatus(session: AppointmentSessionDto, currentPathname: string): EnhancedStepStatus[] {
  const sessionSteps = session.steps || [];
  const currentRouteSegment = currentPathname.split('/').pop() || '';

  // Find furthest completed step (linear progression)
  const completedStepNumbers = sessionSteps.filter((s) => s.isComplete).map((s) => s.order);
  const maxCompletedStep = completedStepNumbers.length > 0 ? Math.max(...completedStepNumbers) : 0;

  return BOOKING_STEPS.map((step) => {
    const sessionStep = sessionSteps.find((s) => s.order === step.order);
    const isComplete = sessionStep?.isComplete || false;
    const isCurrent = currentRouteSegment === step.routePath;

    // Accessibility: Can access up to (furthest completed + 1) OR current step
    const isAccessible = step.order <= maxCompletedStep + 1 || isCurrent;

    // Navigation: Can go back if there are previous steps
    const canNavigateBack = step.order > 1;

    // Navigation: Can go forward if this step is complete AND not the last step
    const canNavigateForward = isComplete && step.order < BOOKING_STEPS.length;

    return {
      ...step,
      isComplete,
      isCurrent,
      isAccessible,
      canNavigateBack,
      canNavigateForward,
    };
  });
}

/**
 * Get the next step in the flow
 */
export function getNextStep(steps: EnhancedStepStatus[]): EnhancedStepStatus | null {
  const currentIndex = steps.findIndex((s) => s.isCurrent);
  return currentIndex >= 0 && currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
}

/**
 * Get the previous step in the flow
 */
export function getPreviousStep(steps: EnhancedStepStatus[]): EnhancedStepStatus | null {
  const currentIndex = steps.findIndex((s) => s.isCurrent);
  return currentIndex > 0 ? steps[currentIndex - 1] : null;
}

/**
 * Calculate overall progress
 */
export function calculateProgress(steps: EnhancedStepStatus[]): {
  completed: number; // Number of completed steps
  total: number; // Total number of steps
  percentage: number; // Progress as percentage (0-100)
  currentNumber: number; // Current step number (1-indexed)
} {
  const completed = steps.filter((s) => s.isComplete).length;
  const currentIndex = steps.findIndex((s) => s.isCurrent);

  return {
    completed,
    total: steps.length,
    percentage: Math.round((completed / steps.length) * 100),
    currentNumber: currentIndex >= 0 ? currentIndex + 1 : 1,
  };
}

/**
 * Validate if user can proceed to next step
 * Returns validation result with optional error message
 */
export function canProceedToNextStep(
  currentStep: EnhancedStepStatus,
  session: AppointmentSessionDto,
): {
  canProceed: boolean;
  reason?: string;
} {
  // Validation rules per step
  const validations: Record<string, () => { canProceed: boolean; reason?: string }> = {
    contact: () => ({
      canProceed: !!session.userId,
      reason: !session.userId ? 'Bruker mangler' : undefined,
    }),

    employee: () => ({
      canProceed: !!session.selectedProfileId,
      reason: !session.selectedProfileId ? 'Velg en behandler' : undefined,
    }),

    'select-services': () => ({
      canProceed: !!session.selectedServices && session.selectedServices.length > 0,
      reason: !session.selectedServices?.length ? 'Velg minst én tjeneste' : undefined,
    }),

    'select-time': () => ({
      canProceed: !!session.selectedStartTime,
      reason: !session.selectedStartTime ? 'Velg et tidspunkt' : undefined,
    }),
  };

  const validator = validations[currentStep.id];
  return validator ? validator() : { canProceed: true };
}

/**
 * Get all incomplete required steps
 * Useful for showing validation errors before final submission
 */
export function getIncompleteRequiredSteps(steps: EnhancedStepStatus[]): EnhancedStepStatus[] {
  return steps.filter((step) => step.isRequired && !step.isComplete);
}

/**
 * Check if booking flow is complete (all required steps done)
 */
export function isFlowComplete(steps: EnhancedStepStatus[]): boolean {
  return steps.filter((s) => s.isRequired).every((s) => s.isComplete);
}
