import { useEffect } from 'react';
import { toast } from 'sonner';

/** How often an open app asks the server for a new version. */
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/** How long after the app opens it first compares its build with the server's. */
export const VERSION_CHECK_DELAY_MS = 5 * 1000;

/**
 * Keeps an open app from running an old version for days.
 *
 * The service worker (vite-plugin-pwa, autoUpdate + skipWaiting + clientsClaim)
 * only looks for a new version when the page loads, and a phone usually resumes
 * the installed app from memory instead of loading it. So this asks for an
 * update when the app comes back to the foreground and every 30 minutes. When
 * a new version takes over, the page on screen still runs the old code, so a
 * banner offers Reload. It never reloads by itself: a half-typed note or
 * payment is never lost.
 *
 * iOS often never fires controllerchange for an installed app that was
 * suspended, and a cached /sw.js can hide a new version for hours. So at the
 * same moments (and shortly after opening) it also fetches /version.json,
 * which every build writes (see vite.config.ts), and shows the same banner
 * when the server's build differs from the one running. Any failure (offline,
 * an error status, or the dev server's HTML instead of JSON) is ignored.
 */
export function useAppUpdateNotice(): void {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !navigator.serviceWorker) return;
    const sw = navigator.serviceWorker;
    // With no controller yet this is the first install, not an update.
    const hadController = !!sw.controller;
    let active = true;

    const reload = () => {
      sw.getRegistration()
        .then((registration) => {
          // Workbox's worker takes over when told to; harmless if it already has.
          registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
        })
        .catch(() => {})
        .finally(() => window.location.reload());
    };

    const showUpdateBanner = () => {
      toast('A new version of GigWrangler is ready.', {
        id: 'app-update',
        duration: Infinity,
        action: { label: 'Reload', onClick: reload },
      });
    };

    const onControllerChange = () => {
      if (!hadController) return;
      showUpdateBanner();
    };

    const updateServiceWorker = () => {
      sw.getRegistration()
        .then((registration) => registration?.update())
        .catch(() => {
          // offline or blocked: the next check will try again
        });
    };

    const checkServerVersion = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data: unknown = await response.json();
        const build = (data as { build?: unknown } | null)?.build;
        if (!active || typeof build !== 'string' || !build) return;
        if (build !== __BUILD_TIMESTAMP__) {
          showUpdateBanner();
          updateServiceWorker();
        }
      } catch {
        // offline, or no version.json (dev server): try again next time
      }
    };

    const checkForUpdate = () => {
      updateServiceWorker();
      void checkServerVersion();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };

    sw.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const timer = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    const firstCheck = window.setTimeout(() => void checkServerVersion(), VERSION_CHECK_DELAY_MS);

    return () => {
      active = false;
      sw.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(timer);
      window.clearTimeout(firstCheck);
    };
  }, []);
}
