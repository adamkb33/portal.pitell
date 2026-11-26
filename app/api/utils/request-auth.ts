// The sign-in token of the server request being handled. The auth middleware (auth-middleware.server) sets it through
// AsyncLocalStorage once per request, after refreshing an expired one; this side imports nothing from Node, so the API
// client and authService can read it wherever they are bundled.
export const REQUEST_AUTH_STORE = Symbol.for('pitell.request-auth');

export type RequestAuthState = {
  /** The request's valid access token, or undefined when signed out. */
  accessToken?: string;
  /** False inside `withoutLogin`: backend calls made there carry no token. */
  sendToken: boolean;
};

function current(): RequestAuthState | undefined {
  const store = (globalThis as Record<symbol, { getStore(): RequestAuthState | undefined } | undefined>)[
    REQUEST_AUTH_STORE
  ];
  return store?.getStore();
}

/** The token a backend call made now should carry: the request's, unless the call runs in `withoutLogin`. */
export function currentAccessToken(): string | undefined {
  const state = current();
  return state?.sendToken ? state.accessToken : undefined;
}

/**
 * Who the request is signed in as, for authService: `{ handled: true, accessToken }` inside a request the auth
 * middleware handles (accessToken may be undefined: signed out), `{ handled: false }` outside one (scripts, unit
 * tests), where callers fall back to the cookie.
 */
export function requestAccessToken(): { handled: true; accessToken?: string } | { handled: false } {
  const state = current();
  return state ? { handled: true, accessToken: state.accessToken } : { handled: false };
}
