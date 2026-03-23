/** Call after a successful hub-side schedule/stop/task mutation so realtime poll won't duplicate toast/notification. */

let lastHubLocalMutationAt = 0;
const SUPPRESS_SOUND_MS = 6_000;

export function markHubLocalMutationCommitted(): void {
  lastHubLocalMutationAt = Date.now();
}

export function shouldSuppressHubRealtimeSound(): boolean {
  return Date.now() - lastHubLocalMutationAt < SUPPRESS_SOUND_MS;
}
