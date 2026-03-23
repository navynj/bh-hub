/**
 * In-process pub/sub for delivery realtime (SSE). Single Node process only;
 * for multiple instances use Redis pub/sub or a managed realtime service.
 */

import type { DeliveryRealtimeEvent } from './delivery-realtime-types';

export class DeliveryRealtimeBus {
  private listeners = new Map<
    string,
    Set<(payload: DeliveryRealtimeEvent) => void>
  >();

  subscribe(
    driverId: string,
    fn: (payload: DeliveryRealtimeEvent) => void,
  ): () => void {
    if (!this.listeners.has(driverId)) {
      this.listeners.set(driverId, new Set());
    }
    this.listeners.get(driverId)!.add(fn);
    return () => {
      const set = this.listeners.get(driverId);
      if (!set) return;
      set.delete(fn);
      if (set.size === 0) this.listeners.delete(driverId);
    };
  }

  publish(driverId: string, payload: DeliveryRealtimeEvent): void {
    const set = this.listeners.get(driverId);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch {
        // ignore subscriber errors
      }
    }
  }
}

const g = globalThis as unknown as {
  __deliveryRealtimeBus?: DeliveryRealtimeBus;
};

export function getDeliveryRealtimeBus(): DeliveryRealtimeBus {
  if (!g.__deliveryRealtimeBus) {
    g.__deliveryRealtimeBus = new DeliveryRealtimeBus();
  }
  return g.__deliveryRealtimeBus;
}
