/** Prices are estimates. Always show them as "ca. 400 kr", never as a bare "400 kr". */
export const formatEstimatedPrice = (amount: number) => `ca. ${amount.toLocaleString('nb-NO')} kr`;

/** Durations are estimates too. Always "ca. 40 min", never a bare "40 min" or "fra 40 min". */
export const formatEstimatedDuration = (minutes: number) => `ca. ${minutes} min`;
