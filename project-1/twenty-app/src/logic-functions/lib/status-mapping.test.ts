import { describe, expect, it } from 'vitest';

import { mapDeliveryStatus, mapOrderStatus, UnmappedStatusError } from './status-mapping';

describe('mapOrderStatus', () => {
  it.each([
    ['created', 'CREATED'],
    ['paid', 'PAID'],
    ['cancelled', 'CANCELLED'],
    ['refunded', 'REFUNDED'],
    ['PAID', 'PAID'],
  ])('maps "%s" to "%s"', (input, expected) => {
    expect(mapOrderStatus(input)).toBe(expected);
  });

  it('throws UnmappedStatusError on an unknown status instead of passing it through', () => {
    expect(() => mapOrderStatus('shipped')).toThrow(UnmappedStatusError);
  });
});

describe('mapDeliveryStatus', () => {
  it.each([
    ['pending', 'PENDING'],
    ['shipped', 'SHIPPED'],
    ['delivered', 'DELIVERED'],
    ['failed', 'FAILED'],
    ['returned', 'RETURNED'],
  ])('maps "%s" to "%s"', (input, expected) => {
    expect(mapDeliveryStatus(input)).toBe(expected);
  });

  it('throws UnmappedStatusError on an unknown status instead of passing it through', () => {
    expect(() => mapDeliveryStatus('out_for_delivery')).toThrow(UnmappedStatusError);
  });
});
