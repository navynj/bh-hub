'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Droppable } from '@/components/ui/drag-and-drop';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  FixedScheduleStopDialog,
  type FixedTemplateStop,
} from '@/features/delivery/components/FixedScheduleStopDialog';
import { FixedScheduleStopRow } from '@/features/delivery/components/FixedScheduleStopRow';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DELETE_STOP_CONFIRM_MESSAGE } from '@/features/delivery/lib/constants';
import { useConfirmDialog } from '@/features/delivery/hooks/useConfirmDialog';
import { useFixedScheduleStopDialog } from '@/features/delivery/hooks/useFixedScheduleStopDialog';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RecurringScheduleEditPage() {
  const params = useParams();
  const driverId = params.driverId as string;
  const dayOfWeek = parseInt(params.dayOfWeek as string, 10);

  const [driverName, setDriverName] = useState('');
  const [stops, setStops] = useState<FixedTemplateStop[]>([]);
  const [loading, setLoading] = useState(true);

  const stopDialog = useFixedScheduleStopDialog();
  const confirmDialog = useConfirmDialog();

  const isValidDay = !Number.isNaN(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6;

  const fetchData = useCallback(async () => {
    if (!driverId || !isValidDay) return;
    const [templateRes, drivers] = await Promise.all([
      fetch(
        `/api/delivery/fixed-schedule/template?driverId=${encodeURIComponent(driverId)}&dayOfWeek=${dayOfWeek}`,
      ),
      fetch('/api/delivery/driver').then((r) => r.json()),
    ]);
    const driver = (drivers as { id: string; name: string | null; email: string | null }[]).find(
      (d) => d.id === driverId,
    );
    setDriverName(driver?.name ?? driver?.email ?? driverId ?? '');

    if (!templateRes.ok) {
      if (templateRes.status === 404) {
        setStops([]);
        return;
      }
      throw new Error('Failed to load template');
    }
    const data = await templateRes.json();
    if (data?.stops?.length) {
      setStops(
        data.stops.map(
          (s: {
            id?: string;
            name: string;
            address?: string | null;
            deliveryLocationId?: string | null;
            lat?: number | null;
            lng?: number | null;
            tasks?: { id?: string; title: string }[];
          }) => ({
            id: s.id ?? `stop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            deliveryLocationId: s.deliveryLocationId ?? null,
            name: s.name ?? '',
            address: s.address ?? null,
            lat: s.lat ?? null,
            lng: s.lng ?? null,
            tasks: (s.tasks ?? []).map((t: { id?: string; title: string }) => ({
              id: t.id,
              title: t.title ?? '',
            })),
          }),
        ),
      );
    } else {
      setStops([]);
    }
  }, [driverId, dayOfWeek, isValidDay]);

  useEffect(() => {
    if (!driverId || !isValidDay) {
      setLoading(false);
      return;
    }
    fetchData()
      .catch(() => toast.error('Failed to load template'))
      .finally(() => setLoading(false));
  }, [driverId, isValidDay, fetchData]);

  const persistStops = useCallback(
    async (newStops: FixedTemplateStop[]) => {
      const payload = newStops.map((s) => ({
        deliveryLocationId: s.deliveryLocationId || null,
        name: s.name,
        address: s.address ?? undefined,
        lat: s.lat ?? undefined,
        lng: s.lng ?? undefined,
        tasks: (s.tasks ?? []).map((t) => ({ title: t.title })),
      }));
      const res = await fetch('/api/delivery/fixed-schedule/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, dayOfWeek, stops: payload }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? res.statusText);
      }
    },
    [driverId, dayOfWeek],
  );

  const handleSetItems = useCallback(
    (action: React.SetStateAction<FixedTemplateStop[]>) => {
      const newStops = typeof action === 'function' ? action(stops) : action;
      setStops(newStops);
      persistStops(newStops).catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to reorder');
        fetchData();
      });
    },
    [stops, persistStops, fetchData],
  );

  const handleDeleteStop = useCallback(
    (stopIndex: number) => {
      const stopName = stops[stopIndex]?.name ?? 'this stop';
      confirmDialog.openConfirm({
        title: 'Delete stop',
        description: DELETE_STOP_CONFIRM_MESSAGE(stopName),
        variant: 'destructive',
        confirmLabel: 'Delete',
        onConfirm: async () => {
          const newStops = stops.filter((_, i) => i !== stopIndex);
          setStops(newStops);
          try {
            await persistStops(newStops);
            toast.success('Stop deleted');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete');
            fetchData();
          }
        },
      });
    },
    [stops, confirmDialog, persistStops, fetchData],
  );

  if (!isValidDay) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Invalid day of week.</p>
        <Button variant="outline" asChild>
          <Link href="/delivery/schedule">Back to Fixed schedule</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return <div className="py-8 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link href="/delivery">Delivery</Link>
        <span>/</span>
        <Link href="/delivery/schedule">Fixed schedule</Link>
        <span>/</span>
        <span>
          {driverName} — {DAY_NAMES[dayOfWeek]}
        </span>
      </div>
      <h1 className="text-2xl font-semibold">
        Recurring schedule — {driverName} — {DAY_NAMES[dayOfWeek]}
      </h1>
      <p className="text-muted-foreground text-sm">
        Stops and tasks for this weekday. When you generate daily schedules for
        a date, this template is applied for the driver.
      </p>

      <div className="border rounded-lg flex flex-col min-h-[200px]">
        <div className="p-4 border-b">
          <h2 className="font-medium">Stops</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Drag to reorder. Use + to add a stop between or at the end.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <Droppable items={stops} setItems={handleSetItems}>
            {stops.map((stop, idx) => (
              <div key={stop.id} className="flex flex-col items-stretch gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="shrink-0 h-4 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => stopDialog.openAdd(idx)}
                  aria-label="Add stop here"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <FixedScheduleStopRow
                  stop={stop}
                  idx={idx}
                  onEditStop={stopDialog.openEdit}
                  onDeleteStop={handleDeleteStop}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full h-8 justify-center text-muted-foreground hover:text-foreground"
              onClick={() => stopDialog.openAdd(stops.length)}
              aria-label="Add stop at end"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add stop
            </Button>
          </Droppable>
        </div>
      </div>

      <FixedScheduleStopDialog
        open={stopDialog.open}
        driverId={driverId}
        dayOfWeek={dayOfWeek}
        stops={stops}
        stopIndex={stopDialog.stopIndex}
        insertIndex={stopDialog.insertIndex}
        onClose={stopDialog.close}
        onSaved={() => {
          stopDialog.close();
          fetchData();
        }}
      />

      <ConfirmDialog {...confirmDialog.dialogProps} />
    </div>
  );
}
