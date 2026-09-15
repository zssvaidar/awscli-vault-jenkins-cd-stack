// specs-2.md §2.3: "Map your internal status enum to Twenty's SELECT option values exactly as
// defined in the Metadata API schema — a mismatch here fails silently as an 'invalid option' 400,
// so validate the mapping table in code, not by convention."
//
// These tables are the single source of truth for external -> Twenty enum values. An unmapped
// key throws instead of passing the raw string through, so a schema/spec drift surfaces loudly.

export class UnmappedStatusError extends Error {
  constructor(kind: string, value: string) {
    super(`No ${kind} mapping for external status "${value}"`);
    this.name = 'UnmappedStatusError';
  }
}

export type OrderStatus = 'CREATED' | 'PAID' | 'CANCELLED' | 'REFUNDED';

const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  created: 'CREATED',
  paid: 'PAID',
  cancelled: 'CANCELLED',
  refunded: 'REFUNDED',
};

export function mapOrderStatus(externalStatus: string): OrderStatus {
  const mapped = ORDER_STATUS_MAP[externalStatus.toLowerCase()];

  if (!mapped) {
    throw new UnmappedStatusError('order status', externalStatus);
  }

  return mapped;
}

export type DeliveryStatus = 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'FAILED' | 'RETURNED';

const DELIVERY_STATUS_MAP: Record<string, DeliveryStatus> = {
  pending: 'PENDING',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  failed: 'FAILED',
  returned: 'RETURNED',
};

export function mapDeliveryStatus(externalStatus: string): DeliveryStatus {
  const mapped = DELIVERY_STATUS_MAP[externalStatus.toLowerCase()];

  if (!mapped) {
    throw new UnmappedStatusError('delivery status', externalStatus);
  }

  return mapped;
}
