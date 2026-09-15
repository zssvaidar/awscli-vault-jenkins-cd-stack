/**
 * crm-sync.test-helpers.ts
 *
 * Shared by every crm-sync.suite-*.test.ts file: the Twenty REST client,
 * the ONE fixture shape, the create/cleanup tracker, and the reference
 * sync functions under test.
 *
 * Replace the syncX() functions below with imports from your real CRM
 * Integration Service — they're reproduced here only so the suites run
 * standalone. Everything else (client, fixture, tracker, sweep) is meant
 * to be used as-is and imported by each suite file.
 */

import { randomUUID } from 'node:crypto';

export const BASE_URL = process.env.TWENTY_BASE_URL ?? '';
export const API_KEY = process.env.TWENTY_API_KEY ?? '';

if (!BASE_URL || !API_KEY) {
  throw new Error(
    'TWENTY_BASE_URL and TWENTY_API_KEY must be set to a dedicated TEST workspace before running these tests.',
  );
}

// ---------------------------------------------------------------------------
// Minimal Twenty REST client (test-only — thin, no retry/backoff logic;
// that belongs to the real service under test, not to the test harness).
// ---------------------------------------------------------------------------

export type TwentyRecord = { id: string; [key: string]: unknown };

export class TwentyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export class TwentyTestClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new TwentyApiError(res.status, `${method} ${path} -> ${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  findByFilter(object: string, filter: string): Promise<{ data: Record<string, TwentyRecord[]> }> {
    return this.request('GET', `/rest/${object}?filter=${encodeURIComponent(filter)}&limit=1`);
  }

  listByFilter(object: string, filter: string): Promise<{ data: Record<string, TwentyRecord[]> }> {
    return this.request('GET', `/rest/${object}?filter=${encodeURIComponent(filter)}`);
  }

  create(object: string, payload: Record<string, unknown>): Promise<{ data: Record<string, TwentyRecord> }> {
    return this.request('POST', `/rest/${object}`, payload);
  }

  batchCreate(
    object: string,
    records: Record<string, unknown>[],
  ): Promise<{ data: Record<string, TwentyRecord[]> }> {
    return this.request('POST', `/rest/batch/${object}`, records);
  }

  patch(object: string, id: string, payload: Record<string, unknown>): Promise<{ data: Record<string, TwentyRecord> }> {
    return this.request('PATCH', `/rest/${object}/${id}`, payload);
  }

  delete(object: string, id: string): Promise<void> {
    return this.request('DELETE', `/rest/${object}/${id}`);
  }
}

export const client = new TwentyTestClient(BASE_URL, API_KEY);

// ---------------------------------------------------------------------------
// Fixture — ONE shape, used by every suite. Namespaced by a fresh runId so
// parallel/re-run executions never collide, and so cleanup can always find
// "everything this test made" by runId alone.
// ---------------------------------------------------------------------------

export interface Fixture {
  runId: string;
  customer: {
    externalCustomerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  order: {
    orderNumber: string;
    items: Array<{ sku: string; productName: string; quantity: number; unitAmountMinor: number }>;
  };
  delivery: {
    deliveryId: string;
    carrier: string;
  };
}

export function makeFixture(): Fixture {
  const runId = `test-${Date.now()}-${randomUUID().slice(0, 8)}`;
  return {
    runId,
    customer: {
      externalCustomerId: `${runId}-cust`,
      firstName: 'Test',
      lastName: `Fixture-${runId}`,
      email: `${runId}@example.invalid`,
      phone: '+81-90-0000-0001',
    },
    order: {
      orderNumber: `${runId}-ord`,
      items: [
        { sku: `${runId}-sku-a`, productName: 'Test Item A', quantity: 2, unitAmountMinor: 1000 },
        { sku: `${runId}-sku-b`, productName: 'Test Item B', quantity: 1, unitAmountMinor: 5000 },
      ],
    },
    delivery: {
      deliveryId: `${runId}-dlv`,
      carrier: 'test-carrier',
    },
  };
}

// ---------------------------------------------------------------------------
// Cleanup harness — tracks every record a test created and deletes them in
// dependency order (items -> delivery -> order -> person). Call tracker()
// fresh per test, track() every id you create, and cleanup() in afterEach.
// ---------------------------------------------------------------------------

type TrackedRecord = { object: string; id: string };

export function makeTracker() {
  const records: TrackedRecord[] = [];
  return {
    track(object: string, id: string) {
      records.push({ object, id });
    },
    async cleanup() {
      const order = ['orderItems', 'deliveries', 'orders', 'people'];
      for (const object of order) {
        const matching = records.filter((r) => r.object === object);
        for (const rec of matching) {
          await client.delete(object, rec.id).catch(() => {
            // best-effort: record may already be gone (e.g. an E3-style test
            // deliberately deleted it) — cleanup should never fail the test
          });
        }
      }
      records.length = 0;
    },
  };
}

/** Belt-and-suspenders sweep by runId, in case a tracked delete was missed
 *  (e.g. the test itself threw before tracking a record it had created).
 *  Safe to call even when nothing matches. Run this in beforeEach AND
 *  afterEach in every suite file. */
export async function sweepByRunId(runId: string): Promise<void> {
  const sweeps: Array<[string, string]> = [
    ['orderItems', `sku[startsWith]:"${runId}"`],
    ['deliveries', `deliveryId[eq]:"${runId}-dlv"`],
    ['orders', `orderNumber[eq]:"${runId}-ord"`],
    ['people', `externalCustomerId[eq]:"${runId}-cust"`],
  ];
  for (const [object, filter] of sweeps) {
    const found = await client.listByFilter(object, filter).catch(() => null);
    if (!found) continue;
    const records = Object.values(found.data)[0] as TwentyRecord[] | undefined;
    for (const rec of records ?? []) {
      await client.delete(object, rec.id).catch(() => {});
    }
  }
}


function isDuplicateEntryError(err: unknown): err is TwentyApiError {
  return (
    err instanceof TwentyApiError &&
    err.status === 400 &&
    /duplicate entry|unique constraint/i.test(err.message)
  );
}

// ---------------------------------------------------------------------------
// Reference sync functions under test — REPLACE with imports from your
// real CRM Integration Service. Logic matches twenty-crm-sync-logic-spec.md.
// ---------------------------------------------------------------------------

export async function syncCustomerCreated(fixture: Fixture): Promise<string> {
  const existing = await client.findByFilter(
    'people',
    `externalCustomerId[eq]:"${fixture.customer.externalCustomerId}"`,
  );
  if (existing.data.people.length > 0) return existing.data.people[0].id;

  try {
    const created = await client.create('people', {
      name: { firstName: fixture.customer.firstName, lastName: fixture.customer.lastName },
      emails: { primaryEmail: fixture.customer.email },
      phones: { primaryPhoneNumber: fixture.customer.phone },
      externalCustomerId: fixture.customer.externalCustomerId,
    });
    return created.data.createPerson.id;
    
  } catch (err) {
    if(isDuplicateEntryError(err)) {
      const retry = await client.findByFilter(
        'people',
        `externalCustomerId[eq]:"${fixture.customer.externalCustomerId}"`,
      );
      if (retry.data.people.length > 0) return retry.data.people[0].id;
    }
    throw err;
  }

}

export async function syncOrderCreated(fixture: Fixture): Promise<{ orderId: string; itemIds: string[] }> {
  const person = await client.findByFilter(
    'people',
    `externalCustomerId[eq]:"${fixture.customer.externalCustomerId}"`,
  );
  if (person.data.people.length === 0) {
    throw new Error('customer not synced yet — caller should retry, not fabricate a Person here');
  }
  const customerId = person.data.people[0].id;

  const order = await client.create('orders', {
    orderNumber: fixture.order.orderNumber,
    status: 'CREATED',
    customerId,
  });
  const orderId = order.data.createOrder.id;

  const items = await client.batchCreate(
    'orderItems',
    fixture.order.items.map((item) => ({
      sku: item.sku,
      productName: item.productName,
      quantity: item.quantity,
      orderId,
    })),
  );

  return { orderId, itemIds: items.data.createOrderItems.map((i) => i.id) };
}

export async function syncOrderStatusChanged(orderId: string, newStatus: string): Promise<void> {
  await client.patch('orders', orderId, { status: newStatus });
}

export async function syncDeliveryStatusUpdated(
  fixture: Fixture,
  orderId: string,
  status: string,
): Promise<string> {
  const existing = await client.findByFilter('deliveries', `deliveryId[eq]:"${fixture.delivery.deliveryId}"`);
  if (existing.data.deliveries.length > 0) {
    const id = existing.data.deliveries[0].id;
    await client.patch('deliveries', id, { status });
    return id;
  }
  const created = await client.create('deliveries', {
    deliveryId: fixture.delivery.deliveryId,
    carrier: fixture.delivery.carrier,
    status,
    orderId,
  });
  return created.data.createDelivery.id;
}