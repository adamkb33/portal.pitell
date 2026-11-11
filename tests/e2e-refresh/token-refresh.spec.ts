import type { APIRequestContext, BrowserContext } from '@playwright/test';
import jwt from 'jsonwebtoken';
import { accessTokenCookie, refreshTokenCookie } from '../../app/routes/auth/_features/auth.cookies.server';
import { backendUrl as gatewayURL, e2eAdmin, frontendUrl as baseURL, jwtSecret } from '../../scripts/e2e/stack';
import { expect, test } from '../e2e-booking/fixtures';

const { email, password, companyId } = e2eAdmin;

type Tokens = { accessToken: string; refreshToken: string };

async function signInWithCompany(request: APIRequestContext): Promise<Tokens> {
  const signIn = await request.post(`${gatewayURL}/base-service/auth/sign-in`, {
    data: { provider: 'LOCAL', emailOrMobile: email, password },
  });
  await expect(signIn, 'The seeded user must be able to sign in.').toBeOK();
  const signInData = (await signIn.json()).data;
  expect(signInData.nextStep).toBe('DONE');

  const companySignIn = await request.post(`${gatewayURL}/base-service/auth/company-sign-in`, {
    headers: { Authorization: `Bearer ${signInData.authTokens.accessToken}` },
    data: { companyId },
  });
  await expect(companySignIn).toBeOK();
  return (await companySignIn.json()).data;
}

async function cookieValue(cookie: typeof accessTokenCookie, token: string) {
  const serialized = await cookie.serialize(token);
  return serialized.split(';')[0].slice(`${cookie.name}=`.length);
}

async function addCookies(context: BrowserContext, opts: { access?: string; refresh?: string }) {
  const cookies = [];
  if (opts.access) {
    cookies.push({ name: 'access_token', value: await cookieValue(accessTokenCookie, opts.access), url: baseURL });
  }
  if (opts.refresh) {
    cookies.push({ name: 'refresh_token', value: await cookieValue(refreshTokenCookie, opts.refresh), url: baseURL });
  }
  await context.addCookies(cookies);
}

async function browserCookies(context: BrowserContext) {
  const all = await context.cookies(baseURL);
  return {
    access: all.find((c) => c.name === 'access_token')?.value,
    refresh: all.find((c) => c.name === 'refresh_token')?.value,
  };
}

// Same claims as the real token, but expired (signed with the portal's JWT secret).
function expiredCopyOf(accessToken: string) {
  const claims = jwt.decode(accessToken) as Record<string, unknown>;
  return jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 3600 }, jwtSecret);
}

test.describe('Token refresh keeps the user signed in', () => {
  test('API: refresh rotates tokens; a replaced token works briefly, then signs the user out everywhere', async ({
    request,
    db,
  }) => {
    const tokens = await signInWithCompany(request);

    const first = await request.post(`${gatewayURL}/base-service/auth/refresh`, {
      params: { companyId },
      data: { refreshToken: tokens.refreshToken },
    });
    await expect(first, 'Refresh with a valid token must succeed.').toBeOK();
    const rotated: Tokens = (await first.json()).data;
    expect(rotated.accessToken).toBeTruthy();
    expect(rotated.refreshToken).toBeTruthy();
    expect(rotated.refreshToken).not.toBe(tokens.refreshToken);

    const me = await request.get(`${gatewayURL}/base-service/auth/me`, {
      headers: { Authorization: `Bearer ${rotated.accessToken}` },
    });
    expect(me.ok()).toBe(true);

    const refresh = (refreshToken: string) =>
      request.post(`${gatewayURL}/base-service/auth/refresh`, { params: { companyId }, data: { refreshToken } });

    // Within 30 seconds the replaced token still works: another tab or request refreshing at the same time.
    await expect(await refresh(tokens.refreshToken)).toBeOK();
    const second = await refresh(rotated.refreshToken);
    await expect(second).toBeOK();
    const latest: Tokens = (await second.json()).data;

    // Later, it means someone else has a copy: it is refused and every refresh token of the user stops working.
    await db.query(
      `
        update base.refresh_tokens set updated_at = now() - interval '1 minute'
        where revoked and user_id = (select id from base.users where email = $1)
      `,
      [email],
    );
    expect((await refresh(tokens.refreshToken)).ok()).toBe(false);
    expect((await refresh(latest.refreshToken)).ok()).toBe(false);
  });

  test('API: a refresh token cannot be used to get into a company the user does not belong to', async ({ request }) => {
    const tokens = await signInWithCompany(request);

    const otherCompany = await request.post(`${gatewayURL}/base-service/auth/refresh`, {
      params: { companyId: 999_999 },
      data: { refreshToken: tokens.refreshToken },
    });
    expect(otherCompany.ok()).toBe(false);

    // The refused attempt did not use up the token.
    const ownCompany = await request.post(`${gatewayURL}/base-service/auth/refresh`, {
      params: { companyId },
      data: { refreshToken: tokens.refreshToken },
    });
    await expect(ownCompany).toBeOK();
    const claims = jwt.decode((await ownCompany.json()).data.accessToken) as { companyId?: number };
    expect(claims.companyId).toBe(companyId);
  });

  test('API: garbage refresh token is rejected', async ({ request }) => {
    const response = await request.post(`${gatewayURL}/base-service/auth/refresh`, {
      data: { refreshToken: 'not-a-real-token' },
    });
    expect(response.ok()).toBe(false);
  });

  test('browser: access cookie gone entirely → still signed in, cookies renewed', async ({
    page,
    context,
    request,
  }) => {
    const tokens = await signInWithCompany(request);
    await addCookies(context, { refresh: tokens.refreshToken });

    await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });

    await expect(page).not.toHaveURL(/\/auth\//);
    const { access, refresh } = await browserCookies(context);
    expect(access, 'A new access cookie should be set by the refresh.').toBeTruthy();
    expect(refresh, 'The refresh cookie should be rotated.').toBeTruthy();
    expect(refresh).not.toBe(await cookieValue(refreshTokenCookie, tokens.refreshToken));
  });

  test('browser: expired access token + valid refresh token → stays signed in with company context', async ({
    page,
    context,
    request,
  }) => {
    const tokens = await signInWithCompany(request);
    await addCookies(context, { access: expiredCopyOf(tokens.accessToken), refresh: tokens.refreshToken });

    await page.goto(`${baseURL}/company/admin`, { waitUntil: 'networkidle' });

    await expect(page).not.toHaveURL(/\/auth\//);
    await expect(
      page.getByRole('heading', { name: 'Administrasjon', exact: true }),
      'User should be refreshed silently and keep their company context, without signing in again.',
    ).toBeVisible();
  });

  test('browser: stays signed in across navigation and reload after a refresh', async ({ page, context, request }) => {
    const tokens = await signInWithCompany(request);
    await addCookies(context, { access: expiredCopyOf(tokens.accessToken), refresh: tokens.refreshToken });

    await page.goto(`${baseURL}/company/admin`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Administrasjon', exact: true })).toBeVisible();

    await page.goto(`${baseURL}/company/booking`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(`${baseURL}/company/booking`);

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL(`${baseURL}/company/booking`);
    await expect(page).not.toHaveURL(/\/auth\//);
  });

  test('browser: invalid refresh token and no access token → signed out cleanly, cookies cleared, no crash', async ({
    page,
    context,
  }) => {
    await addCookies(context, { refresh: 'not-a-real-token' });

    const response = await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
    expect(response?.status()).toBeLessThan(500);

    const { access, refresh } = await browserCookies(context);
    expect(access).toBeFalsy();
    expect(refresh).toBeFalsy();
  });
});
