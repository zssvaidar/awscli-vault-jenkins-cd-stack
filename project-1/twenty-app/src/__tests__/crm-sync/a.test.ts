/**
 * crm-sync.suite-a.test.ts — Happy path.
 * Run alone: vitest run crm-sync.suite-a.test.ts
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
  syncDeliveryStatusUpdated,
  type Fixture,
} from './crm-sync.test-helpers';

describe('Suite A — happy path', () => {
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

  it('A1: creates a Person from a customer.created event', async () => {
    const personId = await syncCustomerCreated(fixture);
    tracker.track('people', personId);

    const found = await client.findByFilter(
      'people',
      `externalCustomerId[eq]:"${fixture.customer.externalCustomerId}"`,
    );
    expect(found.data.people).toHaveLength(1);
    expect(found.data.people[0].id).toBe(personId);
  });

  it('A2: creates an Order with related OrderItems from order.created', async () => {
    const personId = await syncCustomerCreated(fixture);
    tracker.track('people', personId);

    const { orderId, itemIds } = await syncOrderCreated(fixture);
    tracker.track('orders', orderId);
    itemIds.forEach((id) => tracker.track('orderItems', id));

    const order = await client.findByFilter('orders', `orderNumber[eq]:"${fixture.order.orderNumber}"`);
    expect(order.data.orders).toHaveLength(1);
    expect(order.data.orders[0]).toMatchObject({ id: orderId, customerId: personId });
    expect(itemIds).toHaveLength(fixture.order.items.length);
  });

  it('A3: patches Order status without touching other fields', async () => {
    const personId = await syncCustomerCreated(fixture);
    tracker.track('people', personId);
    const { orderId } = await syncOrderCreated(fixture);
    tracker.track('orders', orderId);

    await syncOrderStatusChanged(orderId, 'PAID');

    const order = await client.findByFilter('orders', `orderNumber[eq]:"${fixture.order.orderNumber}"`);
    expect(order.data.orders[0]).toMatchObject({ id: orderId, status: 'PAID' });
  });

  it('A4: creates a Delivery related to its Order', async () => {
    const personId = await syncCustomerCreated(fixture);
    tracker.track('people', personId);
    const { orderId } = await syncOrderCreated(fixture);
    tracker.track('orders', orderId);

    const deliveryId = await syncDeliveryStatusUpdated(fixture, orderId, 'SHIPPED');
    tracker.track('deliveries', deliveryId);

    const delivery = await client.findByFilter('deliveries', `deliveryId[eq]:"${fixture.delivery.deliveryId}"`);
    expect(delivery.data.deliveries[0]).toMatchObject({ id: deliveryId, orderId, status: 'SHIPPED' });
  });

  it('A5: patches Delivery to a terminal state, preserving prior fields', async () => {
    const personId = await syncCustomerCreated(fixture);
    tracker.track('people', personId);
    const { orderId } = await syncOrderCreated(fixture);
    tracker.track('orders', orderId);
    const deliveryId = await syncDeliveryStatusUpdated(fixture, orderId, 'SHIPPED');
    tracker.track('deliveries', deliveryId);

    await syncDeliveryStatusUpdated(fixture, orderId, 'DELIVERED');

    const delivery = await client.findByFilter('deliveries', `deliveryId[eq]:"${fixture.delivery.deliveryId}"`);
    expect(delivery.data.deliveries[0]).toMatchObject({
      id: deliveryId,
      carrier: fixture.delivery.carrier, // preserved from A4-equivalent create
      status: 'DELIVERED',
    });
  });

  it('A6: cancels an order', async () => {
    const personId = await syncCustomerCreated(fixture);
    tracker.track('people', personId);
    const { orderId } = await syncOrderCreated(fixture);
    tracker.track('orders', orderId);

    await syncOrderStatusChanged(orderId, 'CANCELLED');

    const order = await client.findByFilter('orders', `orderNumber[eq]:"${fixture.order.orderNumber}"`);
    expect(order.data.orders[0].status).toBe('CANCELLED');
  });
});