/**
 * Self-repair for a chunk that won't load. The usual cause is a stale copy of
 * the app: an old service-worker precache, or a deploy that briefly served
 * index.html in place of a missing chunk, which then got cached under the
 * chunk's URL. A plain reload doesn't help, because the failing import happens
 * after load and is answered from the same caches, so clear them first.
 */

/** sessionStorage flag: set once this tab has tried the automatic repair. */
export const CHUNK_RELOAD_KEY = 'gw.chunkReloadAttempted';

/**
 * True when this tab may repair and reload by itself: once per session, and
 * never when sessionStorage is unusable, since then nothing could stop a
 * reload loop.
 */
export function canAutoRecover(): boolean {
  try {
    return sessionStorage.getItem(CHUNK_RELOAD_KEY) === null;
  } catch {
    return false;
  }
}

/** Records the automatic attempt. False if it could not be recorded. */
export function markAutoRecoveryAttempted(): boolean {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    return sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Deletes every Cache Storage cache (the Workbox precache included),
 * unregisters the service workers, then reloads. Each cleanup step is best
 * effort: the reload happens even if a browser lacks or blocks either API.
 */
export async function clearCachesAndReload(): Promise<void> {
  try {
    if (typeof caches !== 'undefined' && caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // best effort
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // best effort
  }
  window.location.reload();
}
