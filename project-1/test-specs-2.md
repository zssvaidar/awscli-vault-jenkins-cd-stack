Twenty CRM Sync — Test Specification (against a live workspace)

Companion to twenty-crm-sync-logic-spec.md. This is what to actually run against a real Twenty Cloud (or self-hosted) workspace before trusting the CRM Integration Service in production — not a unit-test spec, a live-integration one.

1. Test environment setup

Use a dedicated workspace, never staging-shares-with-prod. Twenty Cloud lets you spin up a free workspace per environment; self-hosted, run a second container/DB.

Create workspace: twenty-crm-sync-test.
Run the seed script from the parent spec (§5, "Bootstrapping the schema") against it — confirms the seed itself is idempotent and reproducible, which is a test in its own right.
Generate a scoped API key: Settings → API & Webhooks → new key, label it sync-service-test. Record creation date; rotate it at the end of the test cycle regardless of pass/fail.
Set env vars for the test run:
   TWENTY_BASE_URL=https://api.twenty.com          # or self-hosted domain
   TWENTY_API_KEY=<test-workspace-key>
   TWENTY_WORKSPACE=twenty-crm-sync-test
Confirm the schema matches what the sync code expects before running any test case — this catches the "SELECT option casing" and "relation field naming" risks flagged in the previous spec:
   GET /rest/metadata/objects?filter=nameSingular[eq]:"order"

Diff the returned field list/types/SELECT options against the code's mapping table. Fail the whole test run here if they don't match — every downstream test result is meaningless otherwise.

2. Test data fixtures

Use clearly-tagged, disposable fixture data so cleanup (§7) can find everything by prefix:

json
{
  "customer": {
    "externalCustomerId": "test-cust-0001",
    "firstName": "Test", "lastName": "Fixture-0001",
    "email": "test-fixture-0001@example.invalid", "phone": "+81-90-0000-0001"
  },
  "order": {
    "orderNumber": "TEST-ORD-0001",
    "items": [
      { "sku": "TEST-SKU-A", "quantity": 2, "unitAmountMinor": 1000 },
      { "sku": "TEST-SKU-B", "quantity": 1, "unitAmountMinor": 5000 }
    ]
  },
  "delivery": {
    "deliveryId": "TEST-DLV-0001", "carrier": "test-carrier"
  }
}

Use the .invalid TLD for emails (reserved by RFC 2606 for exactly this) and a TEST- / test- prefix on every ID so fixtures are trivially distinguishable from real data and easy to bulk-delete.

3. Test suites
Suite A — Happy path, single pass
#	Case	Steps	Expected result
A1	Customer create	Publish customer.created for test-cust-0001	GET /rest/people?filter=externalCustomerId[eq]:"test-cust-0001" returns exactly 1 record; sync log has status=success, non-null twenty_id
A2	Order create	Publish order.created for TEST-ORD-0001 referencing test-cust-0001	Order exists with correct customerId = the Person's Twenty id; both OrderItems exist with correct orderId
A3	Status transition	Publish order.status_changed → paid	PATCH applied; GET on the order shows status=PAID and no other field changed (diff against A2 snapshot)
A4	Delivery create	Publish delivery.status_updated (shipped) for TEST-DLV-0001	Delivery exists, orderId correctly relates back to the order from A2
A5	Delivery terminal	Publish delivery.status_updated (delivered, deliveredAt set)	Patch-only update; carrier/trackingNumber from A4 preserved, status and deliveredAt updated
A6	Cancellation	Publish order.cancelled	status=CANCELLED, cancelledAt set
Suite B — Idempotency / redelivery
#	Case	Steps	Expected result
B1	Duplicate customer event	Replay the exact customer.created event from A1 (same eventId)	No second Person created; sync log shows the event was skipped (already success), not reprocessed
B2	Duplicate order event, new eventId	Publish order.created again for TEST-ORD-0001 but with a fresh eventId (simulates an at-least-once redelivery with a new envelope)	Service must dedupe on orderNumber, not just eventId — assert no duplicate Order record via GET /rest/orders?filter=orderNumber[eq]:"TEST-ORD-0001" returning exactly 1
B3	Out-of-order status events	Publish order.status_changed (paid→fulfilled) then immediately replay the older created→paid transition	Decide and assert your ordering policy explicitly: either (a) events carry a sequence/timestamp and older ones are dropped, or (b) last-write-wins by consumption order. Whichever the code implements, this test must prove it — this is the most common real-world bug in event sync
Suite C — Ordering / race conditions
#	Case	Steps	Expected result
C1	Order arrives before customer	Publish order.created for a customer that has no prior customer.created event	Order creation must not proceed to create a Person as a side effect; event is retried per the 30s/1m/5m schedule; sync log shows status=pending, attempts incrementing
C2	Customer arrives mid-retry	While C1 is retrying, publish the missing customer.created	Next retry attempt succeeds; final state matches Suite A; verify total attempts stayed within the fast schedule (not escalated to the slow 6-step schedule)
C3	Concurrent customer upserts	Fire two customer.updated events for the same externalCustomerId at effectively the same time (e.g. two parallel requests)	Exactly one Person record exists after both settle; no 409-driven duplicate; if the service logs a caught race per §2.1 of the sync-logic spec, confirm that log line appears
Suite D — Partial failure
#	Case	Steps	Expected result
D1	Order item batch fails after order created	Simulate by publishing an order.created with one item containing an invalid sku type (e.g. inject a non-string) or, more realistically, temporarily revoke item-batch-only capability isn't possible — instead simulate via a network fault injection (see §5) killing the connection between step 2 and step 3 of the sync-logic spec	Order exists in Twenty; OrderItems do not; sync log shows status=partial (not failed); a retry re-runs only the item batch, addressed by the already-created orderId, and does not attempt to recreate the Order
D2	Retry after partial doesn't duplicate	Following D1, let the retry succeed	Exactly 2 OrderItems exist (not 4) — proves the retry targeted the missing batch rather than resending everything
Suite E — Error handling matrix (inject each, one at a time)
#	Injected condition	How to simulate	Expected service behavior
E1	401	Temporarily swap in a revoked/garbage API key	Event is not retried automatically; alert fires; sync log records the failure distinctly from a retryable one
E2	400 invalid option	Publish an order.status_changed with a status string not in the SELECT list (e.g. "shipped_via_dragon")	Not retried as-is; goes to DLQ with full payload attached; no infinite retry loop
E3	404 on patch	Manually delete the test order's Person or Order record directly in the Twenty UI, then publish an update event for it	Service detects the 404, clears twenty_id in its log, and falls back to create rather than erroring out permanently
E4	429	Fire a burst of >100 requests/min against the test workspace (a simple loop) in parallel with a real sync event	Service backs off (respecting Retry-After if returned) rather than immediately failing the event to DLQ
E5	5xx / timeout	Point TWENTY_BASE_URL at an unreachable host for one run, or use a proxy that injects a 503	Standard backoff schedule (1m/5m/30m/2h) is followed; event is not lost, not dead-lettered prematurely
Suite F — Inbound webhooks (Twenty → your services)
#	Case	Steps	Expected result
F1	Valid signed webhook	From the test workspace, manually edit a fixture order's status in the Twenty UI (if a workflow/webhook is configured to fire on update), or trigger the configured Workflow manually	Your webhook handler verifies X-Twenty-Webhook-Signature against HMAC_SHA256(secret, "{timestamp}:{body}") and accepts it
F2	Tampered payload	Replay a captured webhook body with the JSON body altered but the original signature header kept	Handler rejects with signature mismatch; downstream order logic is never invoked
F3	Stale timestamp	Replay a captured webhook with its original valid signature but >5 minutes after occurredAt/timestamp header	Handler rejects as a replay; log the rejection reason
F4	Redelivery / duplicate	Replay a valid, fresh webhook twice with the same event ID	Second delivery is deduped; underlying order action (e.g. cancellation) applied exactly once
4. Verification tooling

Small helper for checking state directly against the API during test runs (adjust to your test runner / language):

bash
# fetch a fixture order by orderNumber and pretty-print
curl -s "$TWENTY_BASE_URL/rest/orders?filter=orderNumber[eq]:\"TEST-ORD-0001\"" \
  -H "Authorization: Bearer $TWENTY_API_KEY" | jq .

# count order items for that order (should match fixture item count)
ORDER_ID=$(curl -s "$TWENTY_BASE_URL/rest/orders?filter=orderNumber[eq]:\"TEST-ORD-0001\"" \
  -H "Authorization: Bearer $TWENTY_API_KEY" | jq -r '.data.orders[0].id')
curl -s "$TWENTY_BASE_URL/rest/orderItems?filter=orderId[eq]:\"$ORDER_ID\"" \
  -H "Authorization: Bearer $TWENTY_API_KEY" | jq '.data.orderItems | length'

Wrap each Suite A–F case as an assertion in your normal test runner (Jest/pytest/etc.), calling the real Twenty API for verification rather than mocking it — the point of this spec is confidence against the actual product, not a re-test of your own mocks.

5. Fault injection for D1/E4/E5

You don't need a full chaos-engineering setup — three lightweight options, pick what fits your stack:

Proxy-in-the-middle: run the sync service's TWENTY_BASE_URL through a local mitmproxy/ toxiproxy instance for the test run; inject latency, connection resets, or forced 5xx/429 on specific routes (e.g. only /rest/batch/orderItems, to get D1's partial-failure state precisely).
Feature flag in the client: a test-only flag in the Twenty API client that throws after N successful calls in a request sequence, simulating step 3 failing right after step 2 succeeds.
Real revoked key for E1, real burst traffic for E4 — these don't need injection, just run them against the live test workspace directly since they're cheap and realistic.
6. Cleanup / teardown

After each full run:

bash
# delete all TEST- prefixed orders (cascade deletes items via relation, confirm this is true
# in your workspace before relying on it — otherwise delete orderItems first)
for id in $(curl -s "$TWENTY_BASE_URL/rest/orders?filter=orderNumber[startsWith]:\"TEST-\"" \
  -H "Authorization: Bearer $TWENTY_API_KEY" | jq -r '.data.orders[].id'); do
  curl -s -X DELETE "$TWENTY_BASE_URL/rest/orders/$id" -H "Authorization: Bearer $TWENTY_API_KEY"
done
# repeat for deliveries (test-dlv-* / TEST-DLV-*) and people (test-cust-*)

Also truncate/reset your own twenty_sync_log rows for external_key LIKE 'test-%' OR 'TEST-%' so the next run starts from a clean idempotency state — otherwise Suite A will pass for the wrong reason (log says success from a prior run, so no API calls are even made).

7. Acceptance criteria (exit gate before production)
 All of Suite A passes on a freshly seeded workspace
 Suite B proves dedup on both eventId and business key (orderNumber/externalCustomerId)
 Suite C proves the ordering race is handled without orphan or duplicate records
 Suite D proves partial-write recovery doesn't duplicate on retry
 Every row of Suite E's error matrix produces the differentiated behavior specified — not just "retries everything the same way," which is the most common failure of this kind of service
 Suite F proves webhook signature verification actually rejects tampered/stale/replayed payloads, not just accepts valid ones (a handler that never rejects anything will still pass F1 alone)
 Full teardown leaves the test workspace with zero TEST-/test- prefixed records
 Schema-diff check from §1 step 5 is wired into CI so a workspace schema change breaks the build before it breaks production sync