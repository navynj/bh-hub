/**
 * Stable string of stop/task fields that change from the driver app (arrive, depart, tasks).
 * Ignores office-only edits (names, addresses, reorder) so poll-based chimes match real driver activity.
 */
export function driverActivityFingerprintFromScheduleJson(
  scheduleText: string,
): string {
  try {
    const data = JSON.parse(scheduleText) as unknown;
    const arr = Array.isArray(data) ? data : [];
    const parts: string[] = [];
    for (const sched of arr) {
      const stops = (sched as { stops?: StopLike[] })?.stops;
      if (!stops?.length) continue;
      const ordered = [...stops].sort((a, b) => a.sequence - b.sequence);
      for (const stop of ordered) {
        const tasks = [...(stop.tasks ?? [])].sort(
          (a, b) => a.sequence - b.sequence,
        );
        const taskPart = tasks
          .map(
            (t) =>
              `${t.id}:${t.completedAt ?? ''}:${t.isDismissed ? 1 : 0}`,
          )
          .join(',');
        parts.push(
          `${stop.id}:${stop.arrivedAt ?? ''}:${stop.departedAt ?? ''}:${taskPart}`,
        );
      }
    }
    return parts.join(';');
  } catch {
    return '';
  }
}

type StopLike = {
  id: string;
  sequence: number;
  arrivedAt: string | null;
  departedAt: string | null;
  tasks?: TaskLike[];
};

type TaskLike = {
  id: string;
  sequence: number;
  completedAt: string | null;
  isDismissed: boolean;
};
