import { useEffect } from 'react';
import { toast } from 'sonner';

/** How often an open app asks the server for a new version. */
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

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
 */
export function useAppUpdateNotice(): void {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !navigator.serviceWorker) return;
    const sw = navigator.serviceWorker;
    // With no controller yet this is the first install, not an update.
    const hadController = !!sw.controller;

    const onControllerChange = () => {
      if (!hadController) return;
      toast('A new version of GigWrangler is ready.', {
        id: 'app-update',
        duration: Infinity,
        action: { label: 'Reload', onClick: () => window.location.reload() },
      });
    };

    const checkForUpdate = () => {
      sw.getRegistration()
        .then((registration) => registration?.update())
        .catch(() => {
          // offline or blocked: the next check will try again
        });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };

    sw.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const timer = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      sw.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(timer);
    };
  }, []);
}
