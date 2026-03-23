'use client';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Droppable } from '@/components/ui/drag-and-drop';
import { CalendarCheck, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { parseISO, isValid } from 'date-fns';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { markHubLocalMutationCommitted } from '@/lib/delivery/hub-local-mutation';
import type { DailySchedule, Stop } from '../types/delivery-schedule-types';
import { SortableStopRow } from './SortableStopRow';

function isStopCompleted(stop: Stop): boolean {
  if (!stop.departedAt) return false;
  const tasks = stop.tasks ?? [];
  return tasks.every((t) => t.completedAt != null);
}

/** Among completed stops, the one with the most recent departedAt (ties: first in list wins). */
function findLatestCompletedStopId(stops: Stop[]): string | null {
  let best: { id: string; t: number } | null = null;
  for (const s of stops) {
    if (!isStopCompleted(s) || !s.departedAt) continue;
    const d = parseISO(s.departedAt);
    const t = isValid(d) ? d.getTime() : 0;
    if (!best || t > best.t) best = { id: s.id, t };
  }
  return best?.id ?? null;
}

/**
 * The one completed stop we keep expanded (not in the collapsed list). If the stop *after*
 * the chronologically latest completed has arrived, we collapse that latest into the group too
 * (driver has moved on to the next stop).
 */
function findExpandedLatestCompletedStopId(stops: Stop[]): string | null {
  const chronologicalLatestId = findLatestCompletedStopId(stops);
  if (chronologicalLatestId == null) return null;
  const idx = stops.findIndex((s) => s.id === chronologicalLatestId);
  if (idx === -1) return null;
  const next = stops[idx + 1];
  if (next?.arrivedAt != null) return null;
  return chronologicalLatestId;
}

/** Completed stops that belong in the collapsed group (not the single expanded row). */
function isCompletedInCollapsedGroup(
  stop: Stop,
  expandedLatestId: string | null,
): boolean {
  if (!isStopCompleted(stop)) return false;
  if (expandedLatestId == null) return true;
  return stop.id !== expandedLatestId;
}

type StopWithIndex = { stop: Stop; idx: number };

type RenderPair =
  | {
      key: string;
      plusAt: number;
      kind: 'olderGroup';
      elderly: StopWithIndex[];
    }
  | { key: string; plusAt: number; kind: 'single'; stop: Stop; idx: number };

function buildRenderPairs(
  stops: Stop[],
  expandedLatestCompletedId: string | null,
): RenderPair[] {
  const pairs: RenderPair[] = [];
  let i = 0;
  while (i < stops.length) {
    const stop = stops[i];
    const isOlder = isCompletedInCollapsedGroup(
      stop,
      expandedLatestCompletedId,
    );

    if (isOlder) {
      const elderly: StopWithIndex[] = [];
      while (i < stops.length) {
        const s = stops[i];
        const o = isCompletedInCollapsedGroup(s, expandedLatestCompletedId);
        if (!o) break;
        elderly.push({ stop: s, idx: i });
        i++;
      }
      pairs.push({
        key: `older-${elderly[0].idx}`,
        plusAt: elderly[0].idx,
        kind: 'olderGroup',
        elderly,
      });
      continue;
    }

    pairs.push({
      key: stop.id,
      plusAt: i,
      kind: 'single',
      stop: stops[i],
      idx: i,
    });
    i++;
  }
  return pairs;
}

function OlderCompletedStopsGroup({
  elderly,
  schedule,
  onEditStop,
  onDeleteStop,
}: {
  elderly: StopWithIndex[];
  schedule: DailySchedule;
  onEditStop: (schedule: DailySchedule, stopIndex: number) => void;
  onDeleteStop: (schedule: DailySchedule, stopIndex: number) => void;
}) {
  const n = elderly.length;
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex-1 w-full min-w-0 rounded-md border bg-muted/30 p-2 text-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md text-left text-muted-foreground hover:bg-muted/60 transition-colors -m-1 p-1"
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="text-sm">
              {n} stop{n === 1 ? '' : 's'} completed
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pt-2">
          {elderly.map(({ stop, idx }) => (
            <SortableStopRow
              key={stop.id}
              stop={stop}
              idx={idx}
              schedule={schedule}
              onEditStop={onEditStop}
              onDeleteStop={onDeleteStop}
              defaultCollapsedWhenCompleted
            />
          ))}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function DriverScheduleCard({
  schedule,
  dateStr,
  onRefresh,
  hasFixedScheduleForDate,
  onEditStop,
  onAddStop,
  onReorderStops,
  onDeleteStop,
}: {
  schedule: DailySchedule;
  dateStr: string;
  onRefresh: () => Promise<unknown>;
  hasFixedScheduleForDate: boolean;
  onEditStop: (schedule: DailySchedule, stopIndex: number) => void;
  onAddStop: (schedule: DailySchedule, atIndex?: number) => void;
  onReorderStops: (schedule: DailySchedule, newStops: Stop[]) => void;
  onDeleteStop: (schedule: DailySchedule, stopIndex: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const stops = schedule.stops ?? [];
  const expandedLatestCompletedId = findExpandedLatestCompletedStopId(stops);
  const renderPairs = buildRenderPairs(stops, expandedLatestCompletedId);

  const handleSetItems = useCallback(
    (action: React.SetStateAction<Stop[]>) => {
      const newStops = typeof action === 'function' ? action(stops) : action;
      if (newStops.length !== stops.length) return;
      onReorderStops(schedule, newStops);
    },
    [schedule, stops, onReorderStops],
  );

  const handleAddFromFixed = useCallback(async () => {
    setAdding(true);
    try {
      const res = await fetch('/api/delivery/daily-schedule/from-fixed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, driverId: schedule.driverId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? res.statusText);
      }
      markHubLocalMutationCommitted();
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setAdding(false);
    }
  }, [dateStr, schedule.driverId, onRefresh]);

  return (
    <div className={'space-y-1'}>
      <Droppable items={stops} setItems={handleSetItems}>
        {renderPairs.map((pair) => {
          const nextStopHasArrived =
            pair.kind === 'single'
              ? pair.stop.arrivedAt != null
              : pair.elderly[0]?.stop.arrivedAt != null;
          return (
            <div key={pair.key} className="flex flex-col items-stretch gap-0">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="shrink-0 h-4 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddStop(schedule, pair.plusAt);
                }}
                disabled={nextStopHasArrived}
                aria-label={
                  nextStopHasArrived
                    ? 'Cannot add stop before an arrived stop'
                    : 'Add stop here'
                }
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              {pair.kind === 'olderGroup' ? (
                <OlderCompletedStopsGroup
                  elderly={pair.elderly}
                  schedule={schedule}
                  onEditStop={onEditStop}
                  onDeleteStop={onDeleteStop}
                />
              ) : (
                <SortableStopRow
                  stop={pair.stop}
                  idx={pair.idx}
                  schedule={schedule}
                  onEditStop={onEditStop}
                  onDeleteStop={onDeleteStop}
                  defaultCollapsedWhenCompleted={
                    !(
                      isStopCompleted(pair.stop) &&
                      expandedLatestCompletedId === pair.stop.id
                    )
                  }
                />
              )}
            </div>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full h-8 justify-center text-muted-foreground hover:text-foreground"
          onClick={() => onAddStop(schedule, stops.length)}
          aria-label="Add stop at end"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add stop
        </Button>
      </Droppable>

      {hasFixedScheduleForDate && stops.length <= 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFromFixed}
            disabled={adding}
          >
            <CalendarCheck className="h-3.5 w-3.5 mr-1" />
            {adding ? 'Adding…' : 'Add from fixed schedule'}
          </Button>
        </div>
      )}
    </div>
  );
}
