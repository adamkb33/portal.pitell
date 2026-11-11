// Sveve's SMS limits: https://sveve.no/apidok/send/
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXTENDED = '^{}\\[~]|€\f';

export function estimateSms(text: string) {
  const characters = Array.from(text);
  const unicode = characters.some((character) => !GSM_BASIC.includes(character) && !GSM_EXTENDED.includes(character));
  const sizes = characters.map((character) => (unicode ? character.length : GSM_EXTENDED.includes(character) ? 2 : 1));
  const length = sizes.reduce((total, size) => total + size, 0);
  if (length === 0) return { units: 0, unicode };
  if (length <= (unicode ? 70 : 160)) return { units: 1, unicode };

  // A two-unit character cannot be split across message parts.
  const capacity = unicode ? 67 : 153;
  let units = 1;
  let used = 0;
  for (const size of sizes) {
    if (used + size > capacity) {
      units += 1;
      used = 0;
    }
    used += size;
  }
  return { units, unicode };
}
