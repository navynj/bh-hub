'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { DeliveryRealtimeEvent } from '@/lib/delivery/delivery-realtime-types';
import { shouldSuppressHubRealtimeSound } from '@/lib/delivery/hub-local-mutation';
import { describeArriveDepartChange } from '@/features/delivery/lib/describe-arrive-depart-change';
import { driverActivityFingerprintFromScheduleJson } from '@/features/delivery/lib/driver-activity-fingerprint';
import {
  attachDeliveryNotificationPermissionListeners,
  showDeliveryUpdatedDesktopNotification,
} from '@/lib/notifications/delivery-desktop-notification';

/** Poll often enough that driver activity updates are picked up within a few seconds. */
const POLL_MS = 5_000;

function stableJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return text;
  }
}

/**
 * Live updates: SSE + polling. Toast + desktop notification only when a stop **arrives** or
 * **departs** (not task-only changes). SSE `driver_status` from driver, or poll detects activity
 * fingerprint change while not suppressed after a hub edit. Tracking-only and location SSE stay silent.
 */
export function useDeliveryHubRealtime(
  driverId: string | null,
  dateStr: string,
  onRefresh: () => void,
) {
  const onRefreshRef = useRef(onRefresh);
  const silentRefreshRef = useRef<() => void>(() => {});
  const notifyDriverStatusFromSseRef = useRef<() => Promise<void>>(async () => {});
  const lastScheduleTextRef = useRef<string | null>(null);
  const driverIdRef = useRef(driverId);
  const dateStrRef = useRef(dateStr);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  useEffect(() => {
    driverIdRef.current = driverId;
    dateStrRef.current = dateStr;
  });

  useEffect(() => {
    silentRefreshRef.current = () => {
      onRefreshRef.current();
    };
    notifyDriverStatusFromSseRef.current = async () => {
      const did = driverIdRef.current;
      const prev = lastScheduleTextRef.current;
      const date = dateStrRef.current;
      if (!did || !prev) {
        onRefreshRef.current();
        return;
      }
      const bust = `_=${Date.now()}`;
      const res = await fetch(
        `/api/delivery/daily-schedule?date=${encodeURIComponent(date)}&driverId=${encodeURIComponent(did)}&${bust}`,
        {
          credentials: 'same-origin',
          cache: 'no-store',
        },
      );
      if (!res.ok) {
        onRefreshRef.current();
        return;
      }
      const next = await res.text();
      const payload = describeArriveDepartChange(prev, next, did);
      if (payload) {
        toast.message(payload.title, {
          description: payload.body.replace(/\n/g, ' '),
        });
        showDeliveryUpdatedDesktopNotification(payload);
      }
      onRefreshRef.current();
      lastScheduleTextRef.current = next;
    };
  });

  useEffect(() => {
    if (!driverId) return;
    return attachDeliveryNotificationPermissionListeners();
  }, [driverId]);

  useEffect(() => {
    if (!driverId) return;
    const es = new EventSource(
      `/api/delivery/realtime/stream?driverId=${encodeURIComponent(driverId)}`,
    );
    es.onmessage = (e) => {
      if (!e.data) return;
      try {
        const data = JSON.parse(e.data) as DeliveryRealtimeEvent;
        if (data.type === 'connected') return;
        if (data.type === 'ping_request') {
          silentRefreshRef.current();
          return;
        }
        if (data.type === 'location') {
          silentRefreshRef.current();
          return;
        }
        if (data.date != null && data.date !== dateStr) return;
        if (data.origin === 'office') {
          silentRefreshRef.current();
          return;
        }
        if (data.type === 'driver_status' && data.origin === 'driver') {
          void notifyDriverStatusFromSseRef.current();
          return;
        }
        silentRefreshRef.current();
      } catch {
        // ignore parse errors
      }
    };
    return () => {
      es.close();
    };
  }, [driverId, dateStr]);

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    let lastScheduleNorm: string | null = null;
    let lastTrackingNorm: string | null = null;
    let lastActivityFp: string | null = null;
    let lastScheduleSnapshot: string | null = null;

    const poll = async () => {
      try {
        const bust = `_=${Date.now()}`;
        const [scheduleRes, trackingRes] = await Promise.all([
          fetch(
            `/api/delivery/daily-schedule?date=${encodeURIComponent(dateStr)}&driverId=${encodeURIComponent(driverId)}&${bust}`,
            {
              credentials: 'same-origin',
              cache: 'no-store',
            },
          ),
          fetch(
            `/api/delivery/driver/${encodeURIComponent(driverId)}/tracking?date=${encodeURIComponent(dateStr)}&${bust}`,
            {
              credentials: 'same-origin',
              cache: 'no-store',
            },
          ),
        ]);
        if (!scheduleRes.ok || cancelled) return;
        const scheduleText = await scheduleRes.text();
        const trackingText = trackingRes.ok ? await trackingRes.text() : '{}';
        const scheduleNorm = stableJson(scheduleText);
        const trackingNorm = stableJson(trackingText);
        const activityFp =
          driverActivityFingerprintFromScheduleJson(scheduleText);

        if (lastActivityFp === null) {
          lastScheduleNorm = scheduleNorm;
          lastTrackingNorm = trackingNorm;
          lastActivityFp = activityFp;
          lastScheduleSnapshot = scheduleText;
          lastScheduleTextRef.current = scheduleText;
          return;
        }

        const activityChanged = activityFp !== lastActivityFp;
        const scheduleStructuralChange = scheduleNorm !== lastScheduleNorm;
        const trackingOnlyChanged =
          !scheduleStructuralChange && trackingNorm !== lastTrackingNorm;

        if (activityChanged) {
          if (shouldSuppressHubRealtimeSound()) {
            silentRefreshRef.current();
          } else {
            const payload = describeArriveDepartChange(
              lastScheduleSnapshot!,
              scheduleText,
              driverId,
            );
            if (payload) {
              toast.message(payload.title, {
                description: payload.body.replace(/\n/g, ' '),
              });
              showDeliveryUpdatedDesktopNotification(payload);
            }
            onRefreshRef.current();
          }
        } else if (trackingOnlyChanged || scheduleStructuralChange) {
          silentRefreshRef.current();
        }

        lastScheduleNorm = scheduleNorm;
        lastTrackingNorm = trackingNorm;
        lastActivityFp = activityFp;
        lastScheduleSnapshot = scheduleText;
        lastScheduleTextRef.current = scheduleText;
      } catch {
        // ignore network errors
      }
    };

    const id = window.setInterval(() => void poll(), POLL_MS);
    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [driverId, dateStr]);
}
