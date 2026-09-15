// specs-2.md §1.2: *Minor fields are integer minor units (e.g. yen, or cents).
// amountMicros always scales to 10^6 regardless of the currency's own minor-unit count,
// so the multiplier is 10^(6 - minorUnits), not a single hardcoded value across currencies.
const CURRENCY_MINOR_UNITS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  KMF: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
};

const DEFAULT_MINOR_UNITS = 2;

export function getMinorUnits(currencyCode: string): number {
  return CURRENCY_MINOR_UNITS[currencyCode.toUpperCase()] ?? DEFAULT_MINOR_UNITS;
}

export function toAmountMicros(amountMinor: number, currencyCode: string): number {
  const minorUnits = getMinorUnits(currencyCode);
  const multiplier = 10 ** (6 - minorUnits);

  return Math.round(amountMinor * multiplier);
}
