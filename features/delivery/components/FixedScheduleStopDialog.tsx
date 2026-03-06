'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DeliveryLocationOption } from '../types/locations';

export type FixedTemplateStop = {
  id: string;
  deliveryLocationId: string | null;
  name: string;
  address: string | null;
  lat?: number | null;
  lng?: number | null;
  tasks: { id?: string; title: string }[];
};

type StopForm = {
  deliveryLocationId: string | null;
  name: string;
  address: string;
  lat: string;
  lng: string;
  tasks: { id?: string; title: string }[];
};

export function FixedScheduleStopDialog({
  open,
  driverId,
  dayOfWeek,
  stops,
  stopIndex,
  insertIndex,
  onClose,
  onSaved,
}: {
  open: boolean;
  driverId: string;
  dayOfWeek: number;
  stops: FixedTemplateStop[];
  stopIndex: number;
  insertIndex: number | null;
  onClose: () => void;
  onSaved: () => void;
}): React.JSX.Element {
  const isAdd = stopIndex < 0;
  const existingStop = !isAdd ? stops[stopIndex] : null;
  const [locations, setLocations] = useState<DeliveryLocationOption[]>([]);
  const [form, setForm] = useState<StopForm>({
    deliveryLocationId: null,
    name: '',
    address: '',
    lat: '',
    lng: '',
    tasks: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existingStop) {
      setForm({
        deliveryLocationId: existingStop.deliveryLocationId ?? null,
        name: existingStop.name ?? '',
        address: existingStop.address ?? '',
        lat: existingStop.lat != null ? String(existingStop.lat) : '',
        lng: existingStop.lng != null ? String(existingStop.lng) : '',
        tasks: (existingStop.tasks ?? []).map((t) => ({
          id: t.id,
          title: t.title ?? '',
        })),
      });
    } else {
      setForm({
        deliveryLocationId: null,
        name: '',
        address: '',
        lat: '',
        lng: '',
        tasks: [],
      });
    }
  }, [open, existingStop]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/delivery/location')
      .then((r) => r.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]));
  }, [open]);

  const updateForm = useCallback((patch: Partial<StopForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const setStopFromLocation = useCallback(
    (locationId: string) => {
      const loc = locations.find((l) => l.id === locationId);
      if (!loc) return;
      setForm((prev) => ({
        ...prev,
        deliveryLocationId: locationId,
        name: loc.name,
        address: loc.address ?? '',
        lat: loc.lat != null ? String(loc.lat) : '',
        lng: loc.lng != null ? String(loc.lng) : '',
      }));
    },
    [locations],
  );

  const addTask = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { title: '' }],
    }));
  }, []);

  const updateTask = useCallback((idx: number, title: string) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t, i) => (i === idx ? { ...t, title } : t)),
    }));
  }, []);

  const removeTask = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== idx),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    const isFromList = form.deliveryLocationId != null;
    const selectedLoc = isFromList
      ? locations.find((l) => l.id === form.deliveryLocationId)
      : null;

    const name = isFromList && selectedLoc
      ? selectedLoc.name
      : form.name.trim();
    if (!name) {
      toast.error('Stop name is required');
      return;
    }

    let lat: number | undefined;
    let lng: number | undefined;
    if (isFromList && selectedLoc) {
      lat = selectedLoc.lat ?? undefined;
      lng = selectedLoc.lng ?? undefined;
    } else {
      const latStr = form.lat.trim();
      const lngStr = form.lng.trim();
      if (latStr || lngStr) {
        const latNum = parseFloat(latStr);
        const lngNum = parseFloat(lngStr);
        if (!Number.isNaN(latNum)) lat = latNum;
        if (!Number.isNaN(lngNum)) lng = lngNum;
      }
    }
    const address =
      isFromList && selectedLoc ? selectedLoc.address ?? undefined : (form.address.trim() || undefined);

    const validTasks = form.tasks.filter((t) => t.title.trim());
    const newStopPayload = {
      deliveryLocationId: form.deliveryLocationId || null,
      name,
      address: address ?? undefined,
      lat,
      lng,
      tasks: validTasks.map((t) => ({ title: t.title.trim() })),
    };

    const payloadStops = isAdd
      ? insertIndex != null && insertIndex >= 0 && insertIndex <= stops.length
        ? [
            ...stops.slice(0, insertIndex).map((s) => ({
              deliveryLocationId: s.deliveryLocationId || null,
              name: s.name,
              address: s.address ?? undefined,
              lat: s.lat ?? undefined,
              lng: s.lng ?? undefined,
              tasks: (s.tasks ?? []).map((t) => ({ title: t.title })),
            })),
            newStopPayload,
            ...stops.slice(insertIndex).map((s) => ({
              deliveryLocationId: s.deliveryLocationId || null,
              name: s.name,
              address: s.address ?? undefined,
              lat: s.lat ?? undefined,
              lng: s.lng ?? undefined,
              tasks: (s.tasks ?? []).map((t) => ({ title: t.title })),
            })),
          ]
        : [
            ...stops.map((s) => ({
              deliveryLocationId: s.deliveryLocationId || null,
              name: s.name,
              address: s.address ?? undefined,
              lat: s.lat ?? undefined,
              lng: s.lng ?? undefined,
              tasks: (s.tasks ?? []).map((t) => ({ title: t.title })),
            })),
            newStopPayload,
          ]
      : stops.map((s, i) => {
          if (i !== stopIndex) {
            return {
              deliveryLocationId: s.deliveryLocationId || null,
              name: s.name,
              address: s.address ?? undefined,
              lat: s.lat ?? undefined,
              lng: s.lng ?? undefined,
              tasks: (s.tasks ?? []).map((t) => ({ title: t.title })),
            };
          }
          return {
            deliveryLocationId: form.deliveryLocationId || null,
            name,
            address: address ?? undefined,
            lat,
            lng,
            tasks: validTasks.map((t) => ({ title: t.title.trim() })),
          };
        });

    setSaving(true);
    try {
      const res = await fetch('/api/delivery/fixed-schedule/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          dayOfWeek,
          stops: payloadStops,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? res.statusText);
      }
      toast.success(isAdd ? 'Stop added' : 'Stop updated');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [
    driverId,
    dayOfWeek,
    stops,
    stopIndex,
    insertIndex,
    isAdd,
    form,
    locations,
    onSaved,
  ]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isAdd ? 'Add stop' : 'Edit stop'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {locations.length > 0 && (
            <div>
              <Label className="text-xs">From list (optional)</Label>
              <Select
                value={form.deliveryLocationId ?? '__none__'}
                onValueChange={(v) => {
                  if (v === '__none__') {
                    updateForm({
                      deliveryLocationId: null,
                      name: '',
                      address: '',
                      lat: '',
                      lng: '',
                    });
                  } else {
                    setStopFromLocation(v);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    — Occasional (enter name &amp; address below)
                  </SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!form.deliveryLocationId && (
            <>
              <div>
                <Label className="text-xs">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="Location name"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Address (optional)</Label>
                <Input
                  value={form.address}
                  onChange={(e) => updateForm({ address: e.target.value })}
                  placeholder="Full address"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Latitude (optional)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.lat}
                    onChange={(e) => updateForm({ lat: e.target.value })}
                    placeholder="e.g. 37.5"
                  />
                </div>
                <div>
                  <Label className="text-xs">Longitude (optional)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.lng}
                    onChange={(e) => updateForm({ lng: e.target.value })}
                    placeholder="e.g. -122.3"
                  />
                </div>
              </div>
            </>
          )}
          {form.deliveryLocationId && (
            <p className="text-muted-foreground text-xs">
              Using name, address, and coordinates from the selected location.
            </p>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Tasks</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addTask}
              >
                <Plus className="h-3 w-3 mr-1" /> Task
              </Button>
            </div>
            <ul className="space-y-1">
              {form.tasks.map((t, j) => (
                <li key={j} className="flex items-center gap-2">
                  <Input
                    className="flex-1 h-8"
                    value={t.title}
                    onChange={(e) => updateTask(j, e.target.value)}
                    placeholder="Task description"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => removeTask(j)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isAdd ? 'Add stop' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
