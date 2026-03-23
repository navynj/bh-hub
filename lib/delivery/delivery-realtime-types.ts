export type DeliveryRealtimeEvent = {
  type:
    | 'connected'
    | 'driver_status'
    | 'schedule'
    | 'location'
    | 'ping_request';
  driverId: string;
  /** YYYY-MM-DD (UTC) for schedule / status / location day scope */
  date?: string;
  /** Who triggered the change (driver app vs hub). */
  origin?: 'driver' | 'office';
};
