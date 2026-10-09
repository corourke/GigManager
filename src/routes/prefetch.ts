/**
 * Start downloading the screen the app lands on, so the first navigation after
 * sign-in doesn't flash the loading spinner. Dynamic imports share the
 * browser's module cache with the lazy routes in screens.tsx. A failure here is
 * harmless: the route's own import (and its ChunkLoadBoundary) handles it.
 */
export function prefetchLandingScreen(isMobile: boolean = window.innerWidth < 768): void {
  const load = isMobile
    ? import('../components/mobile/MobileGigList')
    : import('../components/Dashboard');
  load.catch(() => {});
}
