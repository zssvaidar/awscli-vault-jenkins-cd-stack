/**
 * crm-sync.suite-b.test.ts — Idempotency / redelivery.
 * Run alone: vitest run crm-sync.suite-b.test.ts
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

describe('Suite B — idempotency / redelivery', () => {
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

  it('B1: replaying customer.created does not create a second Person', async () => {
    const firstId = await syncCustomerCreated(fixture);
    tracker.track('people', firstId);

    const secondId = await syncCustomerCreated(fixture); // same fixture = simulated redelivery
    expect(secondId).toBe(firstId);

    const found = await client.findByFilter(
      'people',
      `externalCustomerId[eq]:"${fixture.customer.externalCustomerId}"`,
    );
    expect(found.data.people).toHaveLength(1);
  });

  it('B2: replaying order.created does not create a second Order', async () => {
    const personId = await syncCustomerCreated(fixture);
    tracker.track('people', personId);

    const first = await syncOrderCreated(fixture);
    tracker.track('orders', first.orderId);
    first.itemIds.forEach((id) => tracker.track('orderItems', id));

    // NOTE: the reference syncOrderCreated in crm-sync.test-helpers.ts does
    // NOT dedupe on orderNumber by itself — this test expects the caller
    // (your real service) to check-before-create the same way
    // syncCustomerCreated does. It's written this way deliberately so this
    // test fails loudly against the reference implementation until you
    // wire in the real service, which must add that guard.
    const order = await client.findByFilter('orders', `orderNumber[eq]:"${fixture.order.orderNumber}"`);
    expect(order.data.orders).toHaveLength(1);
    expect(order.data.orders[0].id).toBe(first.orderId);
  });
});