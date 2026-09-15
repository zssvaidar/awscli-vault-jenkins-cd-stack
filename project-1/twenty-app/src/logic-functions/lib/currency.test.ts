import { describe, expect, it } from 'vitest';

import { getMinorUnits, toAmountMicros } from './currency';

describe('getMinorUnits', () => {
  it('returns 0 for zero-decimal currencies', () => {
    expect(getMinorUnits('JPY')).toBe(0);
    expect(getMinorUnits('krw')).toBe(0);
  });

  it('returns 3 for three-decimal currencies', () => {
    expect(getMinorUnits('KWD')).toBe(3);
  });

  it('defaults to 2 for unlisted currencies', () => {
    expect(getMinorUnits('USD')).toBe(2);
    expect(getMinorUnits('EUR')).toBe(2);
    expect(getMinorUnits('XYZ')).toBe(2);
  });
});

describe('toAmountMicros', () => {
  // specs-2.md §1.2 / §2.2's worked example: 458000 JPY minor units -> 458000000000 micros.
  it('scales a zero-decimal currency (JPY) by 10^6', () => {
    expect(toAmountMicros(458_000, 'JPY')).toBe(458_000_000_000);
    expect(toAmountMicros(4_500, 'JPY')).toBe(4_500_000_000);
    expect(toAmountMicros(449_000, 'JPY')).toBe(449_000_000_000);
  });

  it('scales a two-decimal currency (USD) by 10^4', () => {
    expect(toAmountMicros(1_999, 'USD')).toBe(19_990_000);
  });

  it('scales a three-decimal currency (KWD) by 10^3', () => {
    expect(toAmountMicros(1_500, 'KWD')).toBe(1_500_000);
  });
});
