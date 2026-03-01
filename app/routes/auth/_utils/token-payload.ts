import type { AuthenticatedUserPayload, JwtClaims } from '~/api/generated/base';

export const toJwtClaims = (accessToken: string): JwtClaims => {
  const parts = accessToken.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid JWT token format');
  }

  const payload = parts[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
  const claims = JSON.parse(jsonPayload) as JwtClaims;

  return claims;
};

export function toAuthPayload(accessToken?: string): AuthenticatedUserPayload | null {
  if (!accessToken) {
    return null;
  }

  const claims = decodeAccessToken(accessToken);
  if (!claims) {
    return null;
  }

  return {
    id: Number(claims.sub) || 0,
    email: claims.email || '',
    companyId: claims.companyId ? Number(claims.companyId) : undefined,
  };
}

function decodeAccessToken(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  const payload = decodeBase64Url(parts[1]);
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as JwtClaims;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to parse access token payload', error);
    }
    return null;
  }
}

export function decodeBase64Url(segment: string): string | null {
  const padded = padBase64(segment.replace(/-/g, '+').replace(/_/g, '/'));

  try {
    if (typeof window === 'undefined') {
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(padded, 'base64').toString('utf-8');
      }
      return null;
    }

    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(bytes);
    }

    return binary;
  } catch {
    return null;
  }
}

const padBase64 = (value: string) => {
  const remainder = value.length % 4;
  if (remainder === 0) return value;
  const padding = 4 - remainder;
  return value + '='.repeat(padding);
};
