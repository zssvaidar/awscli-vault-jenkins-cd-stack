import { describe, expect, it } from 'vitest';

import order from 'src/objects/order';
import orderItem from 'src/objects/order-item';
import delivery from 'src/objects/delivery';
import syncLogEntry from 'src/objects/sync-log-entry';
import personExternalCustomerId from 'src/fields/person-external-customer-id';
import personOrders from 'src/fields/person-orders';
import syncLogEntryEntityExternalKeyIndex from 'src/indexes/sync-log-entry-entity-external-key';
import syncEvents from 'src/logic-functions/sync-events';

describe('order service schema', () => {
  it.each([
    ['order', order],
    ['order-item', orderItem],
    ['delivery', delivery],
    ['sync-log-entry', syncLogEntry],
    ['person-external-customer-id', personExternalCustomerId],
    ['person-orders', personOrders],
    ['sync-log-entry-entity-external-key index', syncLogEntryEntityExternalKeyIndex],
    ['sync-events logic function', syncEvents],
  ])('%s validates successfully', (_name, result) => {
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
  });
});
