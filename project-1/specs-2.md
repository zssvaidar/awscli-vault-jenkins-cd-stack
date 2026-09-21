Twenty CRM Sync Logic — Detailed Specification

Companion to twenty-crm-integration-spec.md. This covers exactly what the CRM Integration Service does on each event: the event schema in, the Twenty API calls out, request/response payloads, and the decision logic between them.

Confirmed Twenty API conventions used below:

Auth: Authorization: Bearer <API_KEY> on every request.
Filtering: ?filter=field[op]:value (operators: eq, ne, gt, gte, lt, lte, in, and dot-notation for nested/relation fields, e.g. customer.externalCustomerId[eq]:...).
Money fields are a composite type, not a plain number: {"amountMicros": 1500000, "currencyCode": "USD"} — i.e. amountMicros = amount * 1_000_000.
Batch endpoints accept up to 60 records per call.
Every record carries id (Twenty's UUID) and updatedAt, which you should NOT confuse with your own orderNumber/externalCustomerId — always keep both, Twenty's id only exists after the first successful create.
1. Event Schemas (inbound to CRM Integration Service, from your bus)

All events share an envelope:

json
{
  "eventId": "evt_01J...ULID",
  "eventType": "order.status_changed",
  "occurredAt": "2026-09-06T10:15:00.000Z",
  "version": 1,
  "payload": { }
}

eventId is the idempotency key for your own sync log (§4) — not Twenty's.

1.1 customer.created / customer.updated
json
{
  "eventType": "customer.created",
  "payload": {
    "externalCustomerId": "cust_8891",
    "firstName": "Aya",
    "lastName": "Tanaka",
    "email": "aya.tanaka@example.com",
    "phone": "+81-90-1234-5678",
    "companyExternalId": null
  }
}
1.2 order.created
json
{
  "eventType": "order.created",
  "payload": {
    "orderNumber": "ORD-2026-000482",
    "externalCustomerId": "cust_8891",
    "status": "created",
    "currency": "JPY",
    "totalAmountMinor": 458000,
    "source": "web",
    "placedAt": "2026-09-06T10:14:32.000Z",
    "items": [
      { "sku": "SKU-1042", "productName": "Wireless Mouse", "quantity": 2,
        "unitAmountMinor": 4500, "lineTotalMinor": 9000, "bonusAppliedMinor": 0 },
      { "sku": "SKU-2091", "productName": "Mechanical Keyboard", "quantity": 1,
        "unitAmountMinor": 449000, "lineTotalMinor": 449000, "bonusAppliedMinor": 0 }
    ]
  }
}

totalAmountMinor / *Minor fields are integer minor units (e.g. yen, or cents) — convert to Twenty's amountMicros at the boundary: amountMicros = amountMinor * 10_000 for currencies with minorUnit=2 scaled to micros (see §3.4 conversion note; JPY has 0 minor units, so scale accordingly — don't hardcode a single multiplier across currencies).

1.3 order.status_changed
json
{
  "eventType": "order.status_changed",
  "payload": {
    "orderNumber": "ORD-2026-000482",
    "previousStatus": "created",
    "newStatus": "paid",
    "changedAt": "2026-09-06T10:16:05.000Z"
  }
}
1.4 order.cancelled
json
{
  "eventType": "order.cancelled",
  "payload": {
    "orderNumber": "ORD-2026-000482",
    "cancelledAt": "2026-09-06T11:00:00.000Z",
    "reason": "customer_request"
  }
}
1.5 order.refunded
json
{
  "eventType": "order.refunded",
  "payload": {
    "orderNumber": "ORD-2026-000482",
    "refundedAmountMinor": 458000,
    "currency": "JPY",
    "refundedAt": "2026-09-06T12:00:00.000Z",
    "partial": false
  }
}
1.6 delivery.status_updated
json
{
  "eventType": "delivery.status_updated",
  "payload": {
    "deliveryId": "DLV-99213",
    "orderNumber": "ORD-2026-000482",
    "carrier": "yamato",
    "trackingNumber": "YT1234567890JP",
    "trackingUrl": "https://track.yamato.example/YT1234567890JP",
    "status": "shipped",
    "warehouseCode": "WH-TOKYO-01",
    "estimatedDeliveryAt": "2026-09-09T00:00:00.000Z",
    "deliveredAt": null
  }
}
2. Sync algorithms (event → Twenty API calls)
2.1 customer.created / customer.updated → upsert Person

Step 1 — look up existing record:

GET /rest/people?filter=externalCustomerId[eq]:"cust_8891"&limit=1
Authorization: Bearer <API_KEY>

Response (found):

json
{ "data": { "people": [ { "id": "6f1e...-uuid", "updatedAt": "2026-08-20T09:00:00.000Z" } ] } }

Response (not found): {"data": {"people": []}}

Step 2a — not found → create:

POST /rest/people
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "name": { "firstName": "Aya", "lastName": "Tanaka" },
  "emails": { "primaryEmail": "aya.tanaka@example.com", "additionalEmails": [] },
  "phones": { "primaryPhoneNumber": "901234-5678", "primaryPhoneCountryCode": "JP" },
  "externalCustomerId": "cust_8891"
}

Response 201:

json
{ "data": { "createPerson": { "id": "6f1e...-uuid", "createdAt": "...", "updatedAt": "..." } } }

Persist the returned id in your own sync log immediately — it's the only way to address this record on subsequent updates without re-searching.

Step 2b — found → patch:

PATCH /rest/people/6f1e...-uuid
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "name": { "firstName": "Aya", "lastName": "Tanaka" },
  "emails": { "primaryEmail": "aya.tanaka@example.com" },
  "phones": { "primaryPhoneNumber": "901234-5678", "primaryPhoneCountryCode": "JP" }
}

Response 200 with the updated record. Never PATCH externalCustomerId — it's your foreign key into Twenty; treat it as immutable post-creation.

Race condition guard: two events for the same customer arriving concurrently (e.g. a fast double-update) can both miss each other in the GET-then-write window and both try to create. Two mitigations, use both:

Serialize per-externalCustomerId in your consumer (partition the queue by customer ID, or take a short-lived lock keyed on it before the GET).
On a 409/unique-constraint-style error from Twenty on create, treat it as "already exists," re-run the GET, and fall through to the PATCH path instead of failing the event.
2.2 order.created → create Order + batch-create OrderItem

Step 1 — resolve customer relation. Query for the Person by externalCustomerId (§2.1 Step 1). If not found: do not create the order. Push the event back onto the retry queue (§4) — this is the ordering-race case called out in the parent spec. Cap retries at a shorter interval here (e.g. 30s, 1m, 5m) since this is usually just a momentary ordering issue, not a downstream outage.

Step 2 — create the Order:

POST /rest/orders
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "orderNumber": "ORD-2026-000482",
  "status": "CREATED",
  "totalAmount": { "amountMicros": 458000000000, "currencyCode": "JPY" },
  "placedAt": "2026-09-06T10:14:32.000Z",
  "source": "WEB",
  "customerId": "6f1e...-uuid"
}

Note: relation fields on custom objects are written as <relationName>Id (matches how relations resolve to foreign-key-style fields on read, per Twenty's data model). Response 201 returns the new Order.id — persist it.

Step 3 — batch-create OrderItems (single call, ≤60 records — this order has 2, well under the cap; for orders with >60 lines, chunk into multiple batch calls):

POST /rest/batch/orderItems
Content-Type: application/json
Authorization: Bearer <API_KEY>

{
  "orderItems": [
    { "sku": "SKU-1042", "productName": "Wireless Mouse", "quantity": 2,
      "unitPrice": { "amountMicros": 4500000000, "currencyCode": "JPY" },
      "lineTotal": { "amountMicros": 9000000000, "currencyCode": "JPY" },
      "orderId": "<order-uuid-from-step-2>" },
    { "sku": "SKU-2091", "productName": "Mechanical Keyboard", "quantity": 1,
      "unitPrice": { "amountMicros": 449000000000, "currencyCode": "JPY" },
      "lineTotal": { "amountMicros": 449000000000, "currencyCode": "JPY" },
      "orderId": "<order-uuid-from-step-2>" }
  ]
}

Failure handling for step 3: if this fails after step 2 succeeded, you now have an Order with no items — a partial-write state. Log it distinctly (status: "partial" in your sync log, not "failed") and retry only the item batch, addressed by the already-known orderId. Never retry step 2 again once the Order exists (check your sync log for an existing twenty_id before any create call — this is the core idempotency rule for the whole service).

2.3 order.status_changed → minimal patch

Look up the order's Twenty id from your sync log (not from Twenty — you should already have it from step 2.2; only fall back to a GET /rest/orders?filter=orderNumber[eq]:"..." search if your log has no record of it, which itself indicates a gap worth alerting on).

PATCH /rest/orders/<order-uuid>
Content-Type: application/json
Authorization: Bearer <API_KEY>

{ "status": "PAID" }

Map your internal status enum to Twenty's SELECT option values exactly as defined in the Metadata API schema (§5 of the parent spec) — a mismatch here fails silently as an "invalid option" 400, so validate the mapping table in code, not by convention.

2.4 order.cancelled / order.refunded → patch with timestamp
PATCH /rest/orders/<order-uuid>
{ "status": "CANCELLED", "cancelledAt": "2026-09-06T11:00:00.000Z" }
PATCH /rest/orders/<order-uuid>
{ "status": "REFUNDED", "refundedAmount": { "amountMicros": 458000000000, "currencyCode": "JPY" } }

For partial refunds (payload.partial: true), do not overwrite status to REFUNDED — introduce a partiallyRefundedAmount field instead, or leave status as-is and let a human agent decide via a Twenty workflow (see parent spec §4) whether the order should be marked refunded.

2.5 delivery.status_updated → upsert Delivery

Same upsert pattern as §2.1, keyed on deliveryId:

GET /rest/deliveries?filter=deliveryId[eq]:"DLV-99213"&limit=1

Not found → create, including the orderId relation (resolved via the sync log the same way as §2.3):

POST /rest/deliveries
{
  "deliveryId": "DLV-99213", "carrier": "yamato", "trackingNumber": "YT1234567890JP",
  "trackingUrl": "https://track.yamato.example/YT1234567890JP", "status": "SHIPPED",
  "warehouseCode": "WH-TOKYO-01", "estimatedDeliveryAt": "2026-09-09T00:00:00.000Z",
  "orderId": "<order-uuid>"
}

Found → patch only the changed fields (status, trackingNumber if newly assigned, deliveredAt once terminal).

3. GraphQL alternative (for the batch/read-heavy paths)

REST is simpler for single-record upserts; GraphQL is worth using for step 2.1's lookup + create in a single round trip via query batching, and for pulling an order with all nested items in one call (avoids N+1 when re-hydrating for a retry):

graphql
query GetOrderWithItems($orderNumber: String!) {
  orders(filter: { orderNumber: { eq: $orderNumber } }) {
    edges {
      node {
        id
        status
        orderItems { edges { node { id sku quantity } } }
        delivery { id status trackingNumber }
      }
    }
  }
}

Use GraphQL specifically for this "fetch full aggregate" case; keep the mutation path (creates/ patches) on REST since it maps more directly to the per-event, per-object writes above and is easier to log/retry per call.

4. Sync log (idempotency ledger)
sql
CREATE TABLE twenty_sync_log (
  event_id        TEXT PRIMARY KEY,        -- from the event envelope
  event_type      TEXT NOT NULL,
  entity_type     TEXT NOT NULL,           -- 'person' | 'order' | 'order_item' | 'delivery'
  external_key    TEXT NOT NULL,           -- externalCustomerId | orderNumber | deliveryId
  twenty_id       UUID,                    -- null until first successful write
  status          TEXT NOT NULL,           -- 'pending' | 'success' | 'partial' | 'failed'
  attempts        INT NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON twenty_sync_log (entity_type, external_key);

Every API call in §2 is preceded by a read of this table (by entity_type + external_key) and followed by a write. This is what makes retries safe: a retry never re-derives "does this exist in Twenty?" from Twenty itself when a local record already says success with a known twenty_id — it goes straight to PATCH.