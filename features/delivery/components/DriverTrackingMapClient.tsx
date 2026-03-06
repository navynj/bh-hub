'use client';

import { useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type TrackingPoint = { lat: number; lng: number; createdAt?: string };
export type TrackingStop = {
  id: string;
  sequence: number;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  arrivedAt: string | null;
  departedAt: string | null;
};

export type DriverTrackingMapClientProps = {
  currentLocation: { lat: number; lng: number; updatedAt: string } | null;
  stops: TrackingStop[];
  path: TrackingPoint[];
  className?: string;
};

export default function DriverTrackingMapClient({
  currentLocation,
  stops,
  path,
  className,
}: DriverTrackingMapClientProps) {
  const pointsWithCoords = useMemo(
    () =>
      path.filter(
        (p) => typeof p.lat === 'number' && typeof p.lng === 'number',
      ),
    [path],
  );
  const stopPoints = useMemo(
    () =>
      stops.filter(
        (s): s is TrackingStop & { lat: number; lng: number } =>
          s.lat != null && s.lng != null,
      ),
    [stops],
  );
  const center: [number, number] = useMemo(() => {
    if (currentLocation) return [currentLocation.lat, currentLocation.lng];
    if (stopPoints.length) {
      const first = stopPoints[0];
      return [first.lat, first.lng];
    }
    if (pointsWithCoords.length) {
      const p = pointsWithCoords[Math.floor(pointsWithCoords.length / 2)];
      return [p.lat, p.lng];
    }
    return [37.5665, 126.978];
  }, [currentLocation, stopPoints, pointsWithCoords]);

  const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl:
      'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  const driverIcon = L.divIcon({
    className: 'driver-marker',
    html: '<div style="width:24px;height:24px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={13}
        className="h-full min-h-[400px] w-full rounded-lg z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pointsWithCoords.length > 1 && (
          <Polyline
            positions={pointsWithCoords.map(
              (p) => [p.lat, p.lng] as [number, number],
            )}
            color="#2563eb"
            weight={4}
            opacity={0.7}
          />
        )}
        {stopPoints.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={defaultIcon}
          >
            <Popup>
              <span className="font-medium">
                {stop.sequence}. {stop.name}
              </span>
              {stop.address && (
                <p className="text-sm text-gray-600">{stop.address}</p>
              )}
              {stop.arrivedAt && (
                <p className="text-xs text-green-600">Arrived</p>
              )}
              {stop.departedAt && (
                <p className="text-xs text-blue-600">Departed</p>
              )}
            </Popup>
          </Marker>
        ))}
        {currentLocation && (
          <Marker
            position={[currentLocation.lat, currentLocation.lng]}
            icon={driverIcon}
          >
            <Popup>Current position (driver)</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
