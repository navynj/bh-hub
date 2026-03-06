'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { FixedTemplateStop } from './FixedScheduleStopDialog';

export function FixedScheduleStopRow({
  stop,
  idx,
  onEditStop,
  onDeleteStop,
}: {
  stop: FixedTemplateStop;
  idx: number;
  onEditStop: (stopIndex: number) => void;
  onDeleteStop: (stopIndex: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const taskCount = stop.tasks?.length ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-1 w-full min-w-0 items-start gap-2 rounded-md border bg-background p-2.5 text-sm"
    >
      <span
        className="flex h-6 w-6 shrink-0 cursor-grab active:cursor-grabbing touch-none items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-medium"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{stop.name}</p>
        {stop.address && (
          <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {stop.address}
          </p>
        )}
        {taskCount > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {taskCount} task{taskCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 h-7 w-7 p-0"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEditStop(idx);
        }}
        aria-label="Edit stop"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 h-7 w-7 p-0 text-destructive hover:text-destructive"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDeleteStop(idx);
        }}
        aria-label="Delete stop"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
