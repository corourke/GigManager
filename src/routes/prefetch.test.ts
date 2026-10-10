import { describe, it, expect, vi, afterEach } from 'vitest';
import { prefetchLandingScreen } from './prefetch';

// Both landing chunks fail to load, as when a deploy has replaced them
vi.mock('../components/Dashboard', () => {
  throw new TypeError('Failed to fetch dynamically imported module: https://x/assets/Dashboard-old.js');
});
vi.mock('../components/mobile/MobileGigList', () => {
  throw new TypeError('Failed to fetch dynamically imported module: https://x/assets/MobileGigList-old.js');
});

describe('prefetchLandingScreen', () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.unstubAllGlobals();
  });

  it.each([true, false])(
    'swallows a failed prefetch without clearing caches or reloading (mobile: %s)',
    async (isMobile) => {
      const reload = vi.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, reload },
      });
      const keys = vi.fn().mockResolvedValue([]);
      vi.stubGlobal('caches', { keys, delete: vi.fn() });
      const unhandled = vi.fn();
      process.on('unhandledRejection', unhandled);

      prefetchLandingScreen(isMobile);
      await new Promise((r) => setTimeout(r, 10));

      process.off('unhandledRejection', unhandled);
      expect(unhandled).not.toHaveBeenCalled();
      expect(keys).not.toHaveBeenCalled();
      expect(reload).not.toHaveBeenCalled();
      expect(sessionStorage.length).toBe(0);
    },
  );
});
