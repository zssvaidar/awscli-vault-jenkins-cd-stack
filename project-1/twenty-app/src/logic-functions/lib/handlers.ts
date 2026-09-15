import { CoreApiClient } from 'twenty-client-sdk/core';

import { toAmountMicros } from './currency';
import { mapDeliveryStatus, mapOrderStatus } from './status-mapping';
import { isExactReplay, readSyncLogEntry, writeSyncLogEntry } from './sync-log';

export type HandlerResult = { ok: true } | { ok: false; retry: true; reason: string };

const OK: HandlerResult = { ok: true };

// Best-effort E.164 dial-code -> ISO country lookup, covering the codes likely to show up in
// seed/demo traffic. Not exhaustive -- a real deployment should use a proper phone library
// (twenty-sdk already depends on libphonenumber-js internally, but it isn't a direct dependency
// of this app, so we don't reach around it here).
const DIAL_CODE_TO_COUNTRY: Record<string, string> = {
  '1': 'US',
  '44': 'GB',
  '49': 'DE',
  '33': 'FR',
  '61': 'AU',
  '81': 'JP',
  '82': 'KR',
  '86': 'CN',
  '91': 'IN',
  '65': 'SG',
};

function parsePhone(phone: string | null | undefined): { primaryPhoneNumber: string; primaryPhoneCountryCode: string } | null {
  if (!phone) return null;

  const match = phone.match(/^\+(\d{1,3})[-\s]?(.+)$/);

  if (!match) {
    return { primaryPhoneNumber: phone.replace(/-/g, ''), primaryPhoneCountryCode: '' };
  }

  const [, dialCode, rest] = match;

  return {
    primaryPhoneNumber: rest.replace(/-/g, ''),
    primaryPhoneCountryCode: DIAL_CODE_TO_COUNTRY[dialCode] ?? '',
  };
}

// ---------------------------------------------------------------------------
// §2.1 customer.created / customer.updated -> upsert Person
// ---------------------------------------------------------------------------

export type CustomerPayload = {
  externalCustomerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  companyExternalId?: string | null;
};

async function findPersonByExternalCustomerId(client: CoreApiClient, externalCustomerId: string) {
  const result = await client.query({
    people: {
      __args: {
        filter: { externalCustomerId: { eq: externalCustomerId } },
        first: 1,
      },
      edges: { node: { id: true, updatedAt: true } },
    },
  });

  return result.people?.edges[0]?.node ?? null;
}

export async function upsertPerson(
  client: CoreApiClient,
  eventId: string,
  eventType: string,
  payload: CustomerPayload,
): Promise<HandlerResult> {
  const existingLog = await readSyncLogEntry(client, 'PERSON', payload.externalCustomerId);

  if (isExactReplay(existingLog, eventId)) {
    return OK;
  }

  const phone = parsePhone(payload.phone);

  const personData = {
    name: { firstName: payload.firstName, lastName: payload.lastName },
    emails: { primaryEmail: payload.email, additionalEmails: [] as string[] },
    ...(phone ? { phones: phone } : {}),
  };

  let personId: string;

  const existingPerson = await findPersonByExternalCustomerId(client, payload.externalCustomerId);

  if (!existingPerson) {
    try {
      const created = await client.mutation({
        createPerson: {
          __args: { data: { ...personData, externalCustomerId: payload.externalCustomerId } },
          id: true,
        },
      });

      if (!created.createPerson) {
        throw new Error(`Failed to create Person for externalCustomerId ${payload.externalCustomerId}`);
      }

      personId = created.createPerson.id;
    } catch (error) {
      // §2.1 race guard: a concurrent create can 409 on the unique externalCustomerId
      // constraint. Treat that as "already exists" and fall through to the patch path.
      const raced = await findPersonByExternalCustomerId(client, payload.externalCustomerId);

      if (!raced) {
        await writeSyncLogEntry(client, {
          id: existingLog?.id,
          eventId,
          eventType,
          entityType: 'PERSON',
          externalKey: payload.externalCustomerId,
          twentyId: existingLog?.twentyId ?? null,
          status: 'FAILED',
          attempts: (existingLog?.attempts ?? 0) + 1,
          lastError: error instanceof Error ? error.message : String(error),
        });

        throw error;
      }

      personId = raced.id;

      await client.mutation({
        updatePerson: { __args: { id: personId, data: personData }, id: true },
      });
    }
  } else {
    personId = existingPerson.id;

    await client.mutation({
      updatePerson: { __args: { id: personId, data: personData }, id: true },
    });
  }

  await writeSyncLogEntry(client, {
    id: existingLog?.id,
    eventId,
    eventType,
    entityType: 'PERSON',
    externalKey: payload.externalCustomerId,
    twentyId: personId,
    status: 'SUCCESS',
    attempts: (existingLog?.attempts ?? 0) + 1,
    lastError: null,
  });

  return OK;
}
type OrderSourceEnum = 'WEB' | 'MOBILE' | 'POS' | 'API'

// ---------------------------------------------------------------------------
// §2.2 order.created -> create Order + batch-create OrderItems
// ---------------------------------------------------------------------------

export type OrderCreatedPayload = {
  orderNumber: string;
  externalCustomerId: string;
  status: string;
  currency: string;
  totalAmountMinor: number;
  source?: OrderSourceEnum | null;
  placedAt: string;
  items: {
    sku: string;
    productName: string;
    quantity: number;
    unitAmountMinor: number;
    lineTotalMinor: number;
  }[];
};

const ORDER_ITEM_BATCH_SIZE = 60;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

export async function createOrderWithItems(
  client: CoreApiClient,
  eventId: string,
  eventType: string,
  payload: OrderCreatedPayload,
): Promise<HandlerResult> {
  const existingLog = await readSyncLogEntry(client, 'ORDER', payload.orderNumber);

  // Exact redelivery of the same event: fully skip, don't even re-verify (B1/F4).
  if (isExactReplay(existingLog, eventId)) {
    return OK;
  }

  // Redelivery on the business key (orderNumber) with a new eventId (B2): dedupe on
  // orderNumber, not eventId -- this order has already been fully synced.
  if (existingLog?.twentyId && existingLog.status === 'SUCCESS') {
    return OK;
  }

  let orderId = existingLog?.twentyId ?? null;

  if (!orderId) {
    // Step 1 -- resolve the customer relation. If the Person hasn't landed yet (ordering
    // race between customer.created and order.created), decline and ask the bus to retry
    // shortly rather than writing a permanent failure.
    const person = await findPersonByExternalCustomerId(client, payload.externalCustomerId);

    if (!person) {
      return { ok: false, retry: true, reason: 'customer_not_found' };
    }

    // Step 2 -- create the Order. Never re-run this once an id exists in the sync log
    // (checked above) -- only the item batch may be retried after a partial write.
    const created = await client.mutation({
      createOrder: {
        __args: {
          data: {
            orderNumber: payload.orderNumber,
            status: mapOrderStatus(payload.status),
            totalAmount: {
              amountMicros: toAmountMicros(payload.totalAmountMinor, payload.currency),
              currencyCode: payload.currency,
            },
            placedAt: payload.placedAt,
            source: payload.source ? payload.source : null,
            customerId: person.id,
          },
        },
        id: true,
      },
    });

    if (!created.createOrder) {
      throw new Error(`Failed to create Order ${payload.orderNumber}`);
    }

    orderId = created.createOrder.id;

    // Order exists but items are not yet confirmed written -- log "partial" until step 3
    // below succeeds, so a crash between these two writes resumes at the item batch only.
    await writeSyncLogEntry(client, {
      id: existingLog?.id,
      eventId,
      eventType,
      entityType: 'ORDER',
      externalKey: payload.orderNumber,
      twentyId: orderId,
      status: 'PARTIAL',
      attempts: (existingLog?.attempts ?? 0) + 1,
      lastError: null,
    });
  }

  // Step 3 -- batch-create OrderItems, chunked to the API's 60-record cap.
  try {
    for (const batch of chunk(payload.items, ORDER_ITEM_BATCH_SIZE)) {
      await client.mutation({
        createOrderItems: {
          __args: {
            data: batch.map((item) => ({
              sku: item.sku,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: { amountMicros: toAmountMicros(item.unitAmountMinor, payload.currency), currencyCode: payload.currency },
              lineTotal: { amountMicros: toAmountMicros(item.lineTotalMinor, payload.currency), currencyCode: payload.currency },
              orderId,
            })),
          },
          id: true,
        },
      });
    }
  } catch (error) {
    const latestLog = await readSyncLogEntry(client, 'ORDER', payload.orderNumber);

    await writeSyncLogEntry(client, {
      id: latestLog?.id,
      eventId,
      eventType,
      entityType: 'ORDER',
      externalKey: payload.orderNumber,
      twentyId: orderId,
      status: 'PARTIAL',
      attempts: (latestLog?.attempts ?? 0) + 1,
      lastError: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }

  const latestLog = await readSyncLogEntry(client, 'ORDER', payload.orderNumber);

  await writeSyncLogEntry(client, {
    id: latestLog?.id,
    eventId,
    eventType,
    entityType: 'ORDER',
    externalKey: payload.orderNumber,
    twentyId: orderId,
    status: 'SUCCESS',
    attempts: (latestLog?.attempts ?? 0) + 1,
    lastError: null,
  });

  return OK;
}

// ---------------------------------------------------------------------------
// Shared order lookup for the patch-style handlers (§2.3, §2.4)
// ---------------------------------------------------------------------------

async function resolveOrderId(client: CoreApiClient, orderNumber: string): Promise<string | null> {
  const log = await readSyncLogEntry(client, 'ORDER', orderNumber);

  if (log?.twentyId) {
    return log.twentyId;
  }

  // Sync log has no record of this order -- itself a gap worth alerting on, but fall back
  // to a direct lookup so a status/cancel/refund event isn't dropped outright.
  const result = await client.query({
    orders: {
      __args: { filter: { orderNumber: { eq: orderNumber } }, first: 1 },
      edges: { node: { id: true } },
    },
  });

  return result.orders?.edges[0]?.node.id ?? null;
}

async function touchOrderSyncLog(
  client: CoreApiClient,
  orderNumber: string,
  eventId: string,
  eventType: string,
  orderId: string,
): Promise<void> {
  const log = await readSyncLogEntry(client, 'ORDER', orderNumber);

  await writeSyncLogEntry(client, {
    id: log?.id,
    eventId,
    eventType,
    entityType: 'ORDER',
    externalKey: orderNumber,
    twentyId: orderId,
    status: 'SUCCESS',
    attempts: (log?.attempts ?? 0) + 1,
    lastError: null,
  });
}

// ---------------------------------------------------------------------------
// §2.3 order.status_changed -> minimal patch
// ---------------------------------------------------------------------------

export type OrderStatusChangedPayload = {
  orderNumber: string;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
};

export async function patchOrderStatus(
  client: CoreApiClient,
  eventId: string,
  eventType: string,
  payload: OrderStatusChangedPayload,
): Promise<HandlerResult> {
  const existingLog = await readSyncLogEntry(client, 'ORDER', payload.orderNumber);

  if (isExactReplay(existingLog, eventId)) {
    return OK;
  }

  const orderId = existingLog?.twentyId ?? (await resolveOrderId(client, payload.orderNumber));

  if (!orderId) {
    return { ok: false, retry: true, reason: 'order_not_found' };
  }

  await client.mutation({
    updateOrder: {
      __args: { id: orderId, data: { status: mapOrderStatus(payload.newStatus) } },
      id: true,
    },
  });

  await touchOrderSyncLog(client, payload.orderNumber, eventId, eventType, orderId);

  return OK;
}

// ---------------------------------------------------------------------------
// §2.4 order.cancelled / order.refunded -> patch with timestamp
// ---------------------------------------------------------------------------

export type OrderCancelledPayload = {
  orderNumber: string;
  cancelledAt: string;
  reason?: string | null;
};

export async function cancelOrder(
  client: CoreApiClient,
  eventId: string,
  eventType: string,
  payload: OrderCancelledPayload,
): Promise<HandlerResult> {
  const existingLog = await readSyncLogEntry(client, 'ORDER', payload.orderNumber);

  if (isExactReplay(existingLog, eventId)) {
    return OK;
  }

  const orderId = existingLog?.twentyId ?? (await resolveOrderId(client, payload.orderNumber));

  if (!orderId) {
    return { ok: false, retry: true, reason: 'order_not_found' };
  }

  await client.mutation({
    updateOrder: {
      __args: {
        id: orderId,
        data: {
          status: mapOrderStatus('cancelled'),
          cancelledAt: payload.cancelledAt,
          cancelReason: payload.reason ?? null,
        },
      },
      id: true,
    },
  });

  await touchOrderSyncLog(client, payload.orderNumber, eventId, eventType, orderId);

  return OK;
}

export type OrderRefundedPayload = {
  orderNumber: string;
  refundedAmountMinor: number;
  currency: string;
  refundedAt: string;
  partial: boolean;
};

export async function refundOrder(
  client: CoreApiClient,
  eventId: string,
  eventType: string,
  payload: OrderRefundedPayload,
): Promise<HandlerResult> {
  const existingLog = await readSyncLogEntry(client, 'ORDER', payload.orderNumber);

  if (isExactReplay(existingLog, eventId)) {
    return OK;
  }

  const orderId = existingLog?.twentyId ?? (await resolveOrderId(client, payload.orderNumber));

  if (!orderId) {
    return { ok: false, retry: true, reason: 'order_not_found' };
  }

  const amountMicros = toAmountMicros(payload.refundedAmountMinor, payload.currency);

  // §2.4: partial refunds do not overwrite status to REFUNDED -- record the amount and let
  // a human decide via a Twenty workflow whether the order should be marked refunded.
  const data = payload.partial
    ? { partiallyRefundedAmount: { amountMicros, currencyCode: payload.currency } }
    : {
        status: mapOrderStatus('refunded'),
        refundedAmount: { amountMicros, currencyCode: payload.currency },
        refundedAt: payload.refundedAt,
      };

  await client.mutation({
    updateOrder: { __args: { id: orderId, data }, id: true },
  });

  await touchOrderSyncLog(client, payload.orderNumber, eventId, eventType, orderId);

  return OK;
}

// ---------------------------------------------------------------------------
// §2.5 delivery.status_updated -> upsert Delivery
// ---------------------------------------------------------------------------

export type DeliveryStatusUpdatedPayload = {
  deliveryId: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  status: string;
  warehouseCode?: string | null;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
};

async function findDeliveryByDeliveryId(client: CoreApiClient, deliveryId: string) {
  const result = await client.query({
    deliveries: {
      __args: { filter: { deliveryId: { eq: deliveryId } }, first: 1 },
      edges: { node: { id: true } },
    },
  });

  return result.deliveries?.edges[0]?.node ?? null;
}

export async function upsertDelivery(
  client: CoreApiClient,
  eventId: string,
  eventType: string,
  payload: DeliveryStatusUpdatedPayload,
): Promise<HandlerResult> {
  const existingLog = await readSyncLogEntry(client, 'DELIVERY', payload.deliveryId);

  if (isExactReplay(existingLog, eventId)) {
    return OK;
  }

  const status = mapDeliveryStatus(payload.status);
  const existingDelivery = await findDeliveryByDeliveryId(client, payload.deliveryId);

  let deliveryId: string;

  if (!existingDelivery) {
    const orderId = await resolveOrderId(client, payload.orderNumber);

    if (!orderId) {
      return { ok: false, retry: true, reason: 'order_not_found' };
    }

    const created = await client.mutation({
      createDelivery: {
        __args: {
          data: {
            deliveryId: payload.deliveryId,
            carrier: payload.carrier,
            trackingNumber: payload.trackingNumber,
            trackingUrl: payload.trackingUrl ?? null,
            status,
            warehouseCode: payload.warehouseCode ?? null,
            estimatedDeliveryAt: payload.estimatedDeliveryAt ?? null,
            deliveredAt: payload.deliveredAt ?? null,
            orderId,
          },
        },
        id: true,
      },
    });

    if (!created.createDelivery) {
      throw new Error(`Failed to create Delivery ${payload.deliveryId}`);
    }

    deliveryId = created.createDelivery.id;
  } else {
    deliveryId = existingDelivery.id;

    await client.mutation({
      updateDelivery: {
        __args: {
          id: deliveryId,
          data: {
            status,
            trackingNumber: payload.trackingNumber,
            trackingUrl: payload.trackingUrl ?? null,
            deliveredAt: payload.deliveredAt ?? null,
          },
        },
        id: true,
      },
    });
  }

  await writeSyncLogEntry(client, {
    id: existingLog?.id,
    eventId,
    eventType,
    entityType: 'DELIVERY',
    externalKey: payload.deliveryId,
    twentyId: deliveryId,
    status: 'SUCCESS',
    attempts: (existingLog?.attempts ?? 0) + 1,
    lastError: null,
  });

  return OK;
}
