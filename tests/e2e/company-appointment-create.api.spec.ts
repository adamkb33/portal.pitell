import type { APIRequestContext } from '@playwright/test';
import { expect, seedAppointmentHistory, test } from '../e2e-booking/fixtures';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: { id?: string; value?: string };
  data?: T;
  errors?: Array<unknown>;
};

type SignInPayload = {
  nextStep: 'COLLECT_EMAIL' | 'COLLECT_MOBILE' | 'VERIFY_EMAIL' | 'VERIFY_MOBILE' | 'DONE';
  authTokens?: AuthTokens;
};

type CompanyContextPayload = Array<{ id: number; orgNumber?: string; name?: string }>;

type ResolveOrCreatePayload = {
  userId: number;
  status: 'RESOLVED_BY_ID' | 'RESOLVED_EXISTING' | 'CREATED';
};

type BookingProfilePayload = {
  services?: Array<{
    id: number;
    name: string;
    services: Array<{ id: number; name: string }>;
  }>;
};

type SchedulePayload = Array<{
  date: string;
  timeSlots: Array<{ startTime: string; endTime: string }>;
}>;

type CustomersPayload = {
  content?: Array<{ id: number; email?: string; mobileNumber?: string }>;
};

type UserContextPayload = {
  companies?: Array<{
    company?: { id?: number; name?: string };
    roles?: Array<'ADMIN' | 'EMPLOYEE'>;
    products?: Array<'BOOKING' | 'EVENT' | 'TIMESHEET'>;
  }>;
};

function normalizeGatewayUrl(rawUrl: string): string {
  const sanitized = rawUrl.replace(/\/+$/, '');
  try {
    const parsed = new URL(sanitized);
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return sanitized.replace(/^http:\/\/localhost(?=[:/]|$)/, 'http://127.0.0.1');
  }
}

const gatewayUrl = normalizeGatewayUrl(
  process.env.E2E_GATEWAY_URL || process.env.VITE_API_GATEWAY_URL || 'http://127.0.0.1:8080',
);
const companyEmail = process.env.E2E_COMPANY_USER_EMAIL || '';
const companyPassword = process.env.E2E_COMPANY_USER_PASSWORD || '';
const explicitCompanyIdRaw = process.env.E2E_COMPANY_ID || '';
const explicitCompanyId = Number(process.env.E2E_COMPANY_ID || '');
const e2eDebug = process.env.E2E_DEBUG === '1';

function validateE2eEnvironment(): string[] {
  const issues: string[] = [];

  if (!companyEmail.trim()) {
    issues.push('Missing E2E_COMPANY_USER_EMAIL');
  }
  if (!companyPassword.trim()) {
    issues.push('Missing E2E_COMPANY_USER_PASSWORD');
  }

  try {
    const parsedGateway = new URL(gatewayUrl);
    const isHttpProtocol = parsedGateway.protocol === 'http:' || parsedGateway.protocol === 'https:';
    if (!isHttpProtocol) {
      issues.push(`Invalid gateway protocol "${parsedGateway.protocol}". Use http/https.`);
    }
    if (!parsedGateway.hostname) {
      issues.push('Invalid gateway URL: hostname is empty.');
    }
  } catch {
    issues.push(`Invalid gateway URL "${gatewayUrl}".`);
  }

  if (explicitCompanyIdRaw.trim()) {
    const isValidCompanyId = Number.isInteger(explicitCompanyId) && explicitCompanyId > 0;
    if (!isValidCompanyId) {
      issues.push(`Invalid E2E_COMPANY_ID "${explicitCompanyIdRaw}". Use a positive integer.`);
    }
  }

  return issues;
}

const envValidationIssues = validateE2eEnvironment();

if (e2eDebug) {
  const maskedEmail = companyEmail ? companyEmail.replace(/(^.).+(@.*$)/, '$1***$2') : '<missing>';
  const gatewaySource = process.env.E2E_GATEWAY_URL
    ? 'E2E_GATEWAY_URL'
    : process.env.VITE_API_GATEWAY_URL
      ? 'VITE_API_GATEWAY_URL'
      : 'default';
  console.log(
    `[e2e-debug] env gateway=${gatewayUrl} source=${gatewaySource} email=${maskedEmail} companyId=${explicitCompanyIdRaw || '<auto>'}`,
  );
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

function isFutureIso(value: string): boolean {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) && ts > Date.now() + 5 * 60 * 1000;
}

async function failWithResponseBody(
  response: { status(): number; text(): Promise<string> },
  label: string,
): Promise<never> {
  let body = '';
  try {
    body = await response.text();
  } catch {
    body = '<unavailable>';
  }
  throw new Error(`${label} failed with ${response.status()} | body: ${body.slice(0, 1500)}`);
}

async function readResponseBody(response: { text(): Promise<string> }): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<unavailable>';
  }
}

async function tryCompanySignIn(
  request: APIRequestContext,
  baseAccessToken: string,
  companyId: number,
): Promise<AuthTokens> {
  const companySignInResponse = await request.post(`${gatewayUrl}/base-service/auth/company-sign-in`, {
    headers: {
      ...authHeaders(baseAccessToken),
    },
    data: {
      companyId,
    },
  });
  if (!companySignInResponse.ok()) {
    await failWithResponseBody(companySignInResponse, 'Company sign-in');
  }

  const companySignInPayload = (await companySignInResponse.json()) as ApiEnvelope<AuthTokens>;
  expect(companySignInPayload.success).toBe(true);
  expect(companySignInPayload.data?.accessToken).toBeTruthy();
  return companySignInPayload.data!;
}

async function getUserContextForToken(
  request: APIRequestContext,
  scopedAccessToken: string,
): Promise<UserContextPayload> {
  const userContextResponse = await request.get(`${gatewayUrl}/base-service/auth/user-context`, {
    headers: {
      Authorization: `Bearer ${scopedAccessToken}`,
    },
  });
  if (!userContextResponse.ok()) {
    await failWithResponseBody(userContextResponse, 'User context');
  }
  const userContextPayload = (await userContextResponse.json()) as ApiEnvelope<UserContextPayload>;
  return userContextPayload.data || {};
}

async function probeBookingProfile(
  request: APIRequestContext,
  scopedAccessToken: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const response = await request.get(`${gatewayUrl}/booking-service/company-user/profile`, {
    headers: authHeaders(scopedAccessToken),
  });
  const body = response.ok() ? '' : await readResponseBody(response);
  return { ok: response.ok(), status: response.status(), body };
}

async function signInCompanyUser(request: APIRequestContext): Promise<AuthTokens> {
  const response = await request.post(`${gatewayUrl}/base-service/auth/sign-in`, {
    data: {
      provider: 'LOCAL',
      emailOrMobile: companyEmail,
      password: companyPassword,
    },
  });

  if (!response.ok()) {
    await failWithResponseBody(response, 'Sign-in');
  }
  const payload = (await response.json()) as ApiEnvelope<SignInPayload>;
  expect(payload.success).toBe(true);
  expect(payload.data?.nextStep).toBe('DONE');
  expect(payload.data?.authTokens?.accessToken).toBeTruthy();

  const baseTokens = payload.data!.authTokens!;

  const contextsResponse = await request.get(`${gatewayUrl}/base-service/auth/company-contexts`, {
    headers: {
      Authorization: `Bearer ${baseTokens.accessToken}`,
    },
  });
  if (!contextsResponse.ok()) {
    await failWithResponseBody(contextsResponse, 'Company contexts');
  }
  const contextsPayload = (await contextsResponse.json()) as ApiEnvelope<CompanyContextPayload>;
  expect(contextsPayload.success).toBe(true);
  const availableCompanyIds = (contextsPayload.data || [])
    .map((entry) => entry.id)
    .filter((id) => Number.isInteger(id));
  expect(availableCompanyIds.length, 'No company context available for this user.').toBeGreaterThan(0);

  const candidateIds =
    Number.isInteger(explicitCompanyId) && explicitCompanyId > 0
      ? [explicitCompanyId, ...availableCompanyIds.filter((id) => id !== explicitCompanyId)]
      : availableCompanyIds;

  let lastFailure = 'No company context evaluated.';
  for (const companyId of candidateIds) {
    const scopedTokens = await tryCompanySignIn(request, baseTokens.accessToken, companyId);
    const scopedAccessToken = scopedTokens.accessToken;

    const userContextData = await getUserContextForToken(request, scopedAccessToken);
    const companies = userContextData.companies || [];
    const selectedCompany = companies.find((entry) => entry.company?.id === companyId);
    const roleList = selectedCompany?.roles || [];
    const productList = selectedCompany?.products || [];

    const hasRequiredRole = roleList.includes('ADMIN') || roleList.includes('EMPLOYEE');
    const hasBookingProduct = productList.includes('BOOKING');
    if (!hasRequiredRole || !hasBookingProduct) {
      lastFailure = `companyId=${companyId} rejected: roles=[${roleList.join(',') || '<none>'}] products=[${productList.join(',') || '<none>'}]`;
      if (e2eDebug) {
        console.log(`[e2e-debug] ${lastFailure}`);
      }
      continue;
    }

    const bookingProbe = await probeBookingProfile(request, scopedAccessToken);
    if (!bookingProbe.ok) {
      lastFailure = `companyId=${companyId} rejected: booking-profile status=${bookingProbe.status} body=${bookingProbe.body.slice(0, 600)}`;
      if (e2eDebug) {
        console.log(`[e2e-debug] ${lastFailure}`);
      }
      continue;
    }

    if (e2eDebug) {
      console.log(
        `[e2e-debug] selected companyId=${companyId} roles=${roleList.join(',')} products=${productList.join(',')}`,
      );
    }
    return scopedTokens;
  }

  throw new Error(
    `No usable company context for E2E user. Checked ${candidateIds.length} context(s). Last failure: ${lastFailure}`,
  );
}

async function getFirstBookableServiceAndStartTime(
  request: APIRequestContext,
  accessToken: string,
): Promise<{ serviceId: number; startTime: string }> {
  const profileResponse = await request.get(`${gatewayUrl}/booking-service/company-user/profile`, {
    headers: authHeaders(accessToken),
  });
  if (!profileResponse.ok()) {
    await failWithResponseBody(profileResponse, 'Booking profile');
  }
  // The profile endpoint returns the profile itself, not an ApiResponse envelope.
  const profile = (await profileResponse.json()) as BookingProfilePayload;

  const serviceId = profile.services?.[0]?.services?.[0]?.id;
  expect(serviceId, 'No services available for company user booking profile').toBeTruthy();

  const scheduleResponse = await request.post(`${gatewayUrl}/booking-service/company-user/schedules`, {
    headers: authHeaders(accessToken),
    data: { selectedServices: [{ serviceId, quantity: 1 }] },
  });
  if (!scheduleResponse.ok()) {
    await failWithResponseBody(scheduleResponse, 'Schedule');
  }
  const scheduleJson = (await scheduleResponse.json()) as ApiEnvelope<SchedulePayload>;

  const slots = (scheduleJson.data || []).flatMap((day) => day.timeSlots || []);
  const firstFutureSlot = slots.find((slot) => isFutureIso(slot.startTime));
  expect(firstFutureSlot?.startTime, 'No future time slot available for selected service').toBeTruthy();

  return { serviceId: serviceId!, startTime: firstFutureSlot!.startTime };
}

async function getCustomers(request: APIRequestContext, accessToken: string) {
  const customersResponse = await request.get(`${gatewayUrl}/booking-service/company-user/appointments/customers`, {
    headers: authHeaders(accessToken),
    params: { page: '0', size: '25', sort: 'familyName', direction: 'ASC' },
  });
  if (!customersResponse.ok()) {
    await failWithResponseBody(customersResponse, 'Customers');
  }
  return (await customersResponse.json()) as ApiEnvelope<CustomersPayload>;
}

test.describe('Company User Appointment Creation API', () => {
  test.beforeAll(async ({ db }) => {
    await seedAppointmentHistory(db);
  });

  test.beforeEach(() => {
    test.skip(
      envValidationIssues.length > 0,
      `Invalid E2E env configuration: ${envValidationIssues.join(' | ')}. These come from playwright.config.ts.`,
    );
  });

  test('creates appointment for existing customer with direct create endpoint', async ({ request }) => {
    const tokens = await signInCompanyUser(request);
    const customersEnvelope = await getCustomers(request, tokens.accessToken);
    const customerId = customersEnvelope.data?.content?.[0]?.id;
    test.skip(!customerId, 'No customers available to validate existing-customer flow.');

    const { serviceId, startTime } = await getFirstBookableServiceAndStartTime(request, tokens.accessToken);

    const createResponse = await request.post(`${gatewayUrl}/booking-service/company-user/appointments`, {
      headers: authHeaders(tokens.accessToken),
      data: {
        userId: customerId,
        services: [{ serviceId, quantity: 1 }],
        startTime,
      },
    });

    expect(createResponse.ok(), `Create appointment failed with ${createResponse.status()}`).toBeTruthy();
    const createJson = (await createResponse.json()) as ApiEnvelope<{ id: number; userId: number }>;
    expect(createJson.success).toBe(true);
    expect(createJson.data?.id).toBeTruthy();
    expect(createJson.data?.userId).toBe(customerId);
  });

  test('resolves or creates customer user, then creates appointment', async ({ request }) => {
    const tokens = await signInCompanyUser(request);
    const { serviceId, startTime } = await getFirstBookableServiceAndStartTime(request, tokens.accessToken);

    const uniqueEmail = `e2e.appointment.${Date.now()}@example.com`;
    const resolveResponse = await request.post(`${gatewayUrl}/base-service/company-user/customers/resolve-or-create`, {
      headers: authHeaders(tokens.accessToken),
      data: {
        email: uniqueEmail,
        givenName: 'E2E',
        familyName: 'Appointment',
      },
    });

    expect(resolveResponse.ok(), `Resolve-or-create failed with ${resolveResponse.status()}`).toBeTruthy();
    const resolveJson = (await resolveResponse.json()) as ApiEnvelope<ResolveOrCreatePayload>;
    expect(resolveJson.success).toBe(true);
    expect(resolveJson.data?.userId).toBeTruthy();
    expect(['RESOLVED_BY_ID', 'RESOLVED_EXISTING', 'CREATED']).toContain(resolveJson.data?.status);

    const createResponse = await request.post(`${gatewayUrl}/booking-service/company-user/appointments`, {
      headers: authHeaders(tokens.accessToken),
      data: {
        userId: resolveJson.data!.userId,
        services: [{ serviceId, quantity: 1 }],
        startTime,
      },
    });

    expect(createResponse.ok(), `Create appointment failed with ${createResponse.status()}`).toBeTruthy();
    const createJson = (await createResponse.json()) as ApiEnvelope<{ id: number; userId: number }>;
    expect(createJson.success).toBe(true);
    expect(createJson.data?.id).toBeTruthy();
    expect(createJson.data?.userId).toBe(resolveJson.data?.userId);
  });

  test('returns conflict when email and mobile belong to different users (if fixture data exists)', async ({
    request,
  }) => {
    const tokens = await signInCompanyUser(request);
    const customersEnvelope = await getCustomers(request, tokens.accessToken);
    const customers = customersEnvelope.data?.content || [];
    const withEmail = customers.find((customer) => customer.email);
    const withMobile = customers.find((customer) => customer.mobileNumber && customer.id !== withEmail?.id);

    test.skip(
      !withEmail?.email || !withMobile?.mobileNumber,
      'Need at least two distinct customers with email/mobile.',
    );
    const conflictEmail = withEmail!.email!;
    const conflictMobile = withMobile!.mobileNumber!;

    const response = await request.post(`${gatewayUrl}/base-service/company-user/customers/resolve-or-create`, {
      headers: authHeaders(tokens.accessToken),
      data: {
        email: conflictEmail,
        mobileNumber: conflictMobile,
      },
    });

    expect(response.status()).toBe(409);
  });
});
