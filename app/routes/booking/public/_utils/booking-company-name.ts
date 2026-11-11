// Registry names come in capitals ("FREDRIKSTAD BARBERSHOP AS"); show them in normal case, keeping company suffixes.
const COMPANY_SUFFIXES = new Set(['AS', 'ASA', 'ANS', 'DA', 'ENK', 'NUF', 'SA', 'BA']);

export function formatCompanyName(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .split(/\s+/)
    .map((word) => (COMPANY_SUFFIXES.has(word) ? word : word.charAt(0) + word.slice(1).toLocaleLowerCase('nb-NO')))
    .join(' ');
}
