export function parseCompanyId(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

// Only ever a relative, same-origin path — never follow this off-site.
export function getSafeReturnTo(value: string | null | undefined): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') && !/[\\\t\r\n]/.test(value) ? value : null;
}
