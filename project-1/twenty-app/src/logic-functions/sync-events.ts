import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';

import { SYNC_EVENTS_LOGIC_FUNCTION_ID } from 'src/constants/order-service-identifiers';
import {
  cancelOrder,
  createOrderWithItems,
  patchOrderStatus,
  refundOrder,
  upsertDelivery,
  upsertPerson,
  type HandlerResult,
} from 'src/logic-functions/lib/handlers';
import { UnmappedStatusError } from 'src/logic-functions/lib/status-mapping';

// specs-2.md's envelope (§1): { eventId, eventType, occurredAt, version, payload }.
type EventEnvelope = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  version: number;
  payload: Record<string, unknown>;
};

function httpResponse(status: number, body: unknown) {
  return { __twentyHttpResponse: true as const, status, body };
}

export default defineLogicFunction({
  universalIdentifier: SYNC_EVENTS_LOGIC_FUNCTION_ID,
  name: 'Sync events',
  description: 'Webhook entry point for specs-2.md: receives order/customer/delivery lifecycle events and syncs them into Twenty.',
  timeoutSeconds: 60,
  httpRouteTriggerSettings: {
    path: '/sync/events',
    httpMethod: HTTPMethod.POST,
    isAuthRequired: true,
  },
  handler: async (event: { body: EventEnvelope | null }) => {
    const envelope = event.body;

    if (!envelope || !envelope.eventId || !envelope.eventType || !envelope.payload) {
      return httpResponse(400, { error: 'Malformed event envelope' });
    }

    const { eventId, eventType, payload } = envelope;
    const client = new CoreApiClient();

    try {
      let result: HandlerResult;

      switch (eventType) {
        case 'customer.created':
        case 'customer.updated':
          result = await upsertPerson(client, eventId, eventType, payload as never);
          break;
        case 'order.created':
          result = await createOrderWithItems(client, eventId, eventType, payload as never);
          break;
        case 'order.status_changed':
          result = await patchOrderStatus(client, eventId, eventType, payload as never);
          break;
        case 'order.cancelled':
          result = await cancelOrder(client, eventId, eventType, payload as never);
          break;
        case 'order.refunded':
          result = await refundOrder(client, eventId, eventType, payload as never);
          break;
        case 'delivery.status_updated':
          result = await upsertDelivery(client, eventId, eventType, payload as never);
          break;
        default:
          return httpResponse(400, { error: `Unknown eventType "${eventType}"` });
      }

      if (!result.ok) {
        // §2.2 step 1's "push back onto the retry queue": a logic function has no queue of
        // its own, so a 409 tells the external bus to redeliver this event shortly instead.
        return httpResponse(409, { retry: true, reason: result.reason });
      }

      return httpResponse(200, { eventId, status: 'processed' });
    } catch (error) {
      if (error instanceof UnmappedStatusError) {
        return httpResponse(400, { error: error.message });
      }

      return httpResponse(500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
