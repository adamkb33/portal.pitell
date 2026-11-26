const DEFAULT_GATEWAY_URL = 'http://localhost:8010';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getGatewayUrl(): string {
  const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || DEFAULT_GATEWAY_URL;
  return normalizeBaseUrl(gatewayUrl);
}
