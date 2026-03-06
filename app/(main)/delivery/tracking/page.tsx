'use client';

import { useCallback, useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import DriverTrackingMap from '@/features/delivery/components/DriverTrackingMap';
import type { TrackingStop } from '@/features/delivery/components/DriverTrackingMap';
import { MapPin, Navigation, ChevronLeft, ChevronRight } from 'lucide-react';

type DriverRow = { id: string; name: string | null; email: string | null };
type TrackingData = {
  driver: { id: string; name: string | null };
  date: string;
  currentLocation: { lat: number; lng: number; updatedAt: string } | null;
  stops: TrackingStop[];
  path: { lat: number; lng: number; createdAt: string }[];
};

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export default function DeliveryTrackingPage() {
  const [dateStr, setDateStr] = useState(todayStr);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [loadingTracking, setLoadingTracking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/delivery/driver');
      if (!res.ok || cancelled) return;
      const list = await res.json();
      const rows = (list as { id: string; name: string | null; email: string | null }[]).map(
        (d: DriverRow) => ({ id: d.id, name: d.name, email: d.email }),
      );
      setDrivers(rows);
      if (rows.length && !selectedDriverId) setSelectedDriverId(rows[0].id);
    })()
      .finally(() => setLoadingDrivers(false));
    return () => { cancelled = true; };
  }, []);

  const fetchTracking = useCallback(async () => {
    if (!selectedDriverId) {
      setTracking(null);
      return;
    }
    setLoadingTracking(true);
    try {
      const res = await fetch(
        `/api/delivery/driver/${selectedDriverId}/tracking?date=${encodeURIComponent(dateStr)}`,
      );
      if (!res.ok) {
        setTracking(null);
        return;
      }
      const data = await res.json();
      setTracking(data);
    } finally {
      setLoadingTracking(false);
    }
  }, [selectedDriverId, dateStr]);

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 30_000);
    return () => clearInterval(interval);
  }, [fetchTracking]);

  const goPrevDay = () => {
    const d = new Date(dateStr + 'T00:00:00.000Z');
    setDateStr(format(addDays(d, -1), 'yyyy-MM-dd'));
  };
  const goNextDay = () => {
    const d = new Date(dateStr + 'T00:00:00.000Z');
    setDateStr(format(addDays(d, 1), 'yyyy-MM-dd'));
  };
  const isToday = dateStr === todayStr();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <Navigation className="h-6 w-6" />
        Driver tracking (이동경로)
      </h1>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrevDay} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[120px] text-center">
            {isToday ? 'Today' : format(new Date(dateStr + 'Z'), 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={goNextDay} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <select
          className="border rounded-md px-3 py-2 bg-background"
          value={selectedDriverId ?? ''}
          onChange={(e) => setSelectedDriverId(e.target.value || null)}
          disabled={loadingDrivers}
        >
          <option value="">Select driver</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name ?? d.email ?? d.id}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg overflow-hidden border bg-card">
          {loadingTracking ? (
            <div className="min-h-[400px] flex items-center justify-center text-muted-foreground">
              Loading…
            </div>
          ) : tracking ? (
            <DriverTrackingMap
              currentLocation={tracking.currentLocation}
              stops={tracking.stops}
              path={tracking.path}
            />
          ) : (
            <div className="min-h-[400px] flex items-center justify-center text-muted-foreground">
              Select a driver and date to see map
            </div>
          )}
        </div>
        <div className="border rounded-lg p-4 bg-card space-y-3">
          <h2 className="font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Today&apos;s stops & status
          </h2>
          {tracking?.currentLocation && (
            <p className="text-sm text-muted-foreground">
              Last position: {format(new Date(tracking.currentLocation.updatedAt), 'HH:mm')}
            </p>
          )}
          <ul className="space-y-2 max-h-[360px] overflow-y-auto">
            {tracking?.stops?.length ? (
              tracking.stops.map((stop) => (
                <li key={stop.id} className="text-sm border-l-2 border-muted pl-2 py-1">
                  <span className="font-medium">{stop.sequence}. {stop.name}</span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {stop.arrivedAt && <span>Arrived </span>}
                    {stop.departedAt && <span>Departed </span>}
                    {!stop.arrivedAt && !stop.departedAt && <span>—</span>}
                  </div>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No stops for this day</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
