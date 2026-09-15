import { CoreApiClient } from 'twenty-client-sdk/core';

export type SyncEntityType = 'PERSON' | 'ORDER' | 'ORDER_ITEM' | 'DELIVERY';
export type SyncLogStatus = 'PENDING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export type SyncLogEntryRecord = {
  id: string;
  eventId: string;
  eventType: string;
  entityType: SyncEntityType;
  externalKey: string;
  twentyId: string | null;
  status: SyncLogStatus;
  attempts: number;
  lastError: string | null;
};

// specs-2.md §4 declares event_id as the ledger's PRIMARY KEY *and* a unique index on
// (entity_type, external_key). Those two constraints can't both hold across an entity's full
// lifecycle -- order.created, order.status_changed, order.cancelled all touch the *same* order
// under *different* event ids. The read-before/write-after prose is the authoritative behavior:
// one row tracks the current Twenty mapping per (entityType, externalKey), upserted on every
// event; eventId on that row records the last event actually applied, so an exact redelivery
// of that same event is detectable (readSyncLogEntry + compare eventId) and safely skippable.
export async function readSyncLogEntry(
  client: CoreApiClient,
  entityType: SyncEntityType,
  externalKey: string,
): Promise<SyncLogEntryRecord | null> {
  const result = await client.query({
    syncLogEntries: {
      __args: {
        filter: {
          entityType: { eq: entityType },
          externalKey: { eq: externalKey },
        },
        first: 1,
      },
      edges: {
        node: {
          id: true,
          eventId: true,
          eventType: true,
          entityType: true,
          externalKey: true,
          twentyId: true,
          status: true,
          attempts: true,
          lastError: true,
        },
      },
    },
  });

  return (result.syncLogEntries?.edges[0]?.node as SyncLogEntryRecord | undefined) ?? null;
}

// test-specs-2.md B1/F4: an exact redelivery of an already-applied event must be a no-op, not
// just "no duplicate created" -- it should skip re-calling Twenty entirely.
export function isExactReplay(existing: SyncLogEntryRecord | null, eventId: string): boolean {
  return existing?.status === 'SUCCESS' && existing.eventId === eventId;
}

export type WriteSyncLogEntryInput = {
  id?: string;
  eventId: string;
  eventType: string;
  entityType: SyncEntityType;
  externalKey: string;
  twentyId?: string | null;
  status: SyncLogStatus;
  attempts: number;
  lastError?: string | null;
};

export async function writeSyncLogEntry(client: CoreApiClient, entry: WriteSyncLogEntryInput): Promise<void> {
  if (entry.id) {
    await client.mutation({
      updateSyncLogEntry: {
        __args: {
          id: entry.id,
          data: {
            eventId: entry.eventId,
            eventType: entry.eventType,
            twentyId: entry.twentyId ?? null,
            status: entry.status,
            attempts: entry.attempts,
            lastError: entry.lastError ?? null,
          },
        },
        id: true,
      },
    });

    return;
  }

  await client.mutation({
    createSyncLogEntry: {
      __args: {
        data: {
          eventId: entry.eventId,
          eventType: entry.eventType,
          entityType: entry.entityType,
          externalKey: entry.externalKey,
          twentyId: entry.twentyId ?? null,
          status: entry.status,
          attempts: entry.attempts,
          lastError: entry.lastError ?? null,
        },
      },
      id: true,
    },
  });
}
