import type { DeliveryRealtimeEvent } from './delivery-realtime-types';
import { getDeliveryRealtimeBus } from './realtime-bus';

export type { DeliveryRealtimeEvent } from './delivery-realtime-types';

export function emitDeliveryRealtimeEvent(payload: DeliveryRealtimeEvent): void {
  getDeliveryRealtimeBus().publish(payload.driverId, payload);
}

/** Prisma @db.Date or Timestamptz → YYYY-MM-DD UTC calendar day. */
export function scheduleDateToUtcDayString(d: Date): string {
  return d.toISOString().slice(0, 10);
}
