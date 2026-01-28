export function appendCompanyIdParam(href: string, encodedCompanyId?: string | null) {
  if (!encodedCompanyId) return href;

  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}companyId=${encodedCompanyId}`;
}
