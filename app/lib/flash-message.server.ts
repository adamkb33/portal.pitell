// lib/flash.server.ts
import { randomBytes } from 'node:crypto';
import { createCookieSessionStorage, redirect } from 'react-router';
import type { ApiMessage } from '~/api/generated';

/**
 * The secret that signs the flash cookie, so nobody can forge a toast. No setup needed: without SESSION_SECRET the
 * server makes a random one each time it starts. A flash cookie only lives 5 seconds, so a restart just drops a toast
 * that was in flight. Set SESSION_SECRET only if the app ever runs as several server instances behind a load balancer
 * (they must share the secret to read each other's toasts).
 */
function flashCookieSecret(): string {
  return process.env.SESSION_SECRET || randomBytes(32).toString('hex');
}

const { getSession, commitSession } = createCookieSessionStorage({
  cookie: {
    name: '__flash',
    httpOnly: true,
    maxAge: 5,
    path: '/',
    sameSite: 'lax',
    secrets: [flashCookieSecret()],
    secure: process.env.NODE_ENV === 'production',
  },
});

export type FlashMessage = {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
  messageId?: ApiMessage['id'];
};

type FlashTextInput = string | ApiMessage;

function normalizeFlashMessage(type: FlashMessage['type'], text: FlashTextInput): FlashMessage {
  if (typeof text === 'string') {
    return { type, text };
  }

  return {
    type,
    text: text.value || text.id,
    messageId: text.id,
  };
}

export async function setFlashMessage(request: Request, message: FlashMessage) {
  const session = await getSession(request.headers.get('Cookie'));
  session.flash('message', message);
  return commitSession(session);
}

export async function getFlashMessage(request: Request) {
  const session = await getSession(request.headers.get('Cookie'));
  const message = session.get('message') as FlashMessage | null;
  return {
    message,
    headers: await commitSession(session),
  };
}

export async function redirectWithFlash(
  request: Request,
  url: string,
  message: FlashMessage,
  additionalHeaders?: HeadersInit,
) {
  const flashCookie = await setFlashMessage(request, message);
  const headers = new Headers(additionalHeaders);
  headers.append('Set-Cookie', flashCookie);

  return redirect(url, { headers });
}

export async function redirectWithSuccess(
  request: Request,
  url: string,
  text: FlashTextInput,
  additionalHeaders?: HeadersInit,
) {
  return redirectWithFlash(request, url, normalizeFlashMessage('success', text), additionalHeaders);
}

export async function redirectWithError(
  request: Request,
  url: string,
  text: FlashTextInput,
  additionalHeaders?: HeadersInit,
) {
  return redirectWithFlash(request, url, normalizeFlashMessage('error', text), additionalHeaders);
}

export async function redirectWithInfo(
  request: Request,
  url: string,
  text: FlashTextInput,
  additionalHeaders?: HeadersInit,
) {
  return redirectWithFlash(request, url, normalizeFlashMessage('info', text), additionalHeaders);
}

export async function redirectWithWarning(
  request: Request,
  url: string,
  text: FlashTextInput,
  additionalHeaders?: HeadersInit,
) {
  return redirectWithFlash(request, url, normalizeFlashMessage('warning', text), additionalHeaders);
}
