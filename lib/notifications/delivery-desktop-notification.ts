import type { DeliveryHubNotificationPayload } from '@/features/delivery/lib/describe-arrive-depart-change';

/**
 * Web Notifications API (Chrome, Edge, Safari) for delivery updates.
 *
 * Localhost is a secure context — permission and `new Notification()` work the same as on HTTPS.
 * Permission is per-origin: `http://localhost:3000` and `http://127.0.0.1:3000` are different sites.
 *
 * If permission is "granted" but you see no banner: Chrome often does not pop a prominent banner
 * while **this tab is focused** (updates may appear quietly in the notification center / tray only).
 * Test with the tab in the background, and check OS settings (macOS: System Settings → Notifications → Chrome).
 */

export function attachDeliveryNotificationPermissionListeners(): () => void {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return () => {};
  }
  if (Notification.permission !== 'default') {
    return () => {};
  }

  const ask = () => {
    void Notification.requestPermission();
    window.removeEventListener('click', ask);
    window.removeEventListener('keydown', ask);
  };

  window.addEventListener('click', ask, { passive: true });
  window.addEventListener('keydown', ask, { passive: true });

  return () => {
    window.removeEventListener('click', ask);
    window.removeEventListener('keydown', ask);
  };
}

export function showDeliveryUpdatedDesktopNotification(
  payload?: DeliveryHubNotificationPayload,
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = payload?.title ?? 'Delivery updated';
  const body = payload?.body ?? 'Driver stop or task status changed.';

  try {
    new Notification(title, {
      body,
      tag: 'bh-hub-delivery',
      silent: false,
    });
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[bh-hub] Notification failed', e);
    }
  }
}
