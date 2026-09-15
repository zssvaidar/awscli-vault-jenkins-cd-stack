/**
 * crm-sync.suite-e.test.ts — Error handling matrix.
 * Run alone: vitest run crm-sync.suite-e.test.ts
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  client,
  makeFixture,
  makeTracker,
  sweepByRunId,
  syncCustomerCreated,
  syncOrderCreated,
  syncOrderStatusChanged,
  TwentyApiError,
  TwentyTestClient,
  type Fixture,
} from './crm-sync.test-helpers';

describe('Suite E — error handling matrix', () => {
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

  it('E2: an invalid status option is rejected (400), not silently accepted', async () => {
    const personId = await syncCustomerCreated(fixture);
    tracker.track('people', personId);
    const { orderId } = await syncOrderCreated(fixture);
    tracker.track('orders', orderId);

    await expect(syncOrderStatusChanged(orderId, 'NOT_A_REAL_STATUS')).rejects.toMatchObject({
      status: 400,
    });

    // confirm the bad write didn't partially apply
    const order = await client.findByFilter('orders', `orderNumber[eq]:"${fixture.order.orderNumber}"`);
    expect(order.data.orders[0].status).toBe('CREATED');
  });

  it('E3: patching a deleted Order 404s, and the caller can detect it', async () => {
    const personId = await syncCustomerCreated(fixture);
    tracker.track('people', personId);
    const { orderId } = await syncOrderCreated(fixture);
    // deliberately delete out-of-band, simulating the record being removed
    // in Twenty since the caller's sync log last saw it
    await client.delete('orders', orderId);

    await expect(syncOrderStatusChanged(orderId, 'PAID')).rejects.toBeInstanceOf(TwentyApiError);
    await expect(syncOrderStatusChanged(orderId, 'PAID')).rejects.toMatchObject({ status: 404 });
  });

  it('E1: a revoked/garbage API key produces a 401, not a silent no-op', async () => {
    // exercised against a throwaway client so it doesn't affect the shared
    // client's key for other tests in this file
    const badClient = new TwentyTestClient(process.env.TWENTY_BASE_URL ?? '', 'not-a-real-key');

    await expect(badClient.findByFilter('people', 'externalCustomerId[eq]:"anything"')).rejects.toMatchObject({
      status: 401,
    });
  });
});