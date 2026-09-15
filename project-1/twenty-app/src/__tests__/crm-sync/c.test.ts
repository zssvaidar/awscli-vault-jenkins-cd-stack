/**
 * crm-sync.suite-c.test.ts — Ordering / race conditions.
 * Run alone: vitest run crm-sync.suite-c.test.ts
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  client,
  makeFixture,
  makeTracker,
  sweepByRunId,
  syncCustomerCreated,
  syncOrderCreated,
  type Fixture,
} from './crm-sync.test-helpers';


export class TwentyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}


describe('Suite C — ordering / race conditions', () => {
  let fixture: Fixture;
  let tracker: ReturnType<typeof makeTracker>;

  beforeEach(async () => {
    fixture = makeFixture();
    tracker = makeTracker();
    await sweepByRunId(fixture.runId);
  });

  afterEach(async () => {
    await tracker.cleanup();
    await sweepByRunId(fixture.runId);
  });

  it('C1: order.created before customer.created is rejected, not fabricated', async () => {
    // deliberately skip syncCustomerCreated — no Person exists for this fixture
    await expect(syncOrderCreated(fixture)).rejects.toThrow(/customer not synced yet/);

    const order = await client.findByFilter('orders', `orderNumber[eq]:"${fixture.order.orderNumber}"`);
    expect(order.data.orders).toHaveLength(0);
  });

  it('C2: retrying order.created after the customer arrives succeeds', async () => {
    await expect(syncOrderCreated(fixture)).rejects.toThrow();

    const personId = await syncCustomerCreated(fixture);
    tracker.track('people', personId);

    const { orderId, itemIds } = await syncOrderCreated(fixture);
    tracker.track('orders', orderId);
    itemIds.forEach((id) => tracker.track('orderItems', id));

    const order = await client.findByFilter('orders', `orderNumber[eq]:"${fixture.order.orderNumber}"`);
    expect(order.data.orders[0]).toMatchObject({ id: orderId, customerId: personId });
  });

  it('C3: concurrent customer.updated events settle to exactly one Person', async () => {
    const [idA, idB] = await Promise.all([syncCustomerCreated(fixture), syncCustomerCreated(fixture)]);
    // both calls race the same find-then-create; whichever record survives,
    // track both possible ids so cleanup can't miss either
    tracker.track('people', idA);
    if (idB !== idA) tracker.track('people', idB);

    const found = await client.findByFilter(
      'people',
      `externalCustomerId[eq]:"${fixture.customer.externalCustomerId}"`,
    );
    expect(found.data.people).toHaveLength(1);
  });
});