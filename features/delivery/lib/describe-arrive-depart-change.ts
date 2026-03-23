import { format, parseISO, isValid } from 'date-fns';

export type DeliveryHubNotificationPayload = {
  title: string;
  body: string;
};

type StopSnap = {
  id: string;
  sequence: number;
  name: string;
  arrivedAt: string | null;
  departedAt: string | null;
};

type ScheduleSnap = {
  driverName: string;
  stops: StopSnap[];
};

function formatStopTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'h:mm a') : iso;
}

function parseScheduleForDriver(
  scheduleText: string,
  driverId: string,
): ScheduleSnap | null {
  try {
    const data = JSON.parse(scheduleText) as unknown;
    const arr = Array.isArray(data) ? data : [];
    const sched = arr.find(
      (s: { driverId?: string }) => s.driverId === driverId,
    ) as
      | {
          driver?: { name?: string | null };
          stops?: Array<{
            id: string;
            sequence: number;
            name: string;
            arrivedAt: string | null;
            departedAt: string | null;
          }>;
        }
      | undefined;
    if (!sched) return null;
    const driverName = sched.driver?.name?.trim() || 'Driver';
    const stops = [...(sched.stops ?? [])].sort(
      (a, b) => a.sequence - b.sequence,
    );
    return {
      driverName,
      stops: stops.map((s) => ({
        id: s.id,
        sequence: s.sequence,
        name: s.name,
        arrivedAt: s.arrivedAt ?? null,
        departedAt: s.departedAt ?? null,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Compares two schedule JSON responses for one driver. Returns a notification payload only when
 * a stop gained a new **arrival** or **departure** timestamp (driver activity). Task-only changes
 * return null so the hub can refresh silently without toast/desktop notification.
 */
export function describeArriveDepartChange(
  previousScheduleText: string,
  nextScheduleText: string,
  driverId: string,
): DeliveryHubNotificationPayload | null {
  const prev = parseScheduleForDriver(previousScheduleText, driverId);
  const next = parseScheduleForDriver(nextScheduleText, driverId);
  if (!prev || !next) return null;

  const byIdPrev = new Map(prev.stops.map((s) => [s.id, s]));

  for (const stop of next.stops) {
    const p = byIdPrev.get(stop.id);
    if (!p) continue;

    const prevA = p.arrivedAt;
    const prevD = p.departedAt;
    const nextA = stop.arrivedAt;
    const nextD = stop.departedAt;

    const departedNew = !prevD && !!nextD;
    const arrivedNew = !prevA && !!nextA;

    if (departedNew) {
      return {
        title: `${next.driverName} — Departed from ${stop.name}`,
        body: `${stop.name}\nDeparted at ${formatStopTime(nextD)}`,
      };
    }
    if (arrivedNew) {
      return {
        title: `${next.driverName} — Arrived at ${stop.name}`,
        body: `${stop.name}\nArrived at ${formatStopTime(nextA)}`,
      };
    }
  }

  return null;
}
