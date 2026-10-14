import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import {
  useAppUpdateNotice,
  UPDATE_CHECK_INTERVAL_MS,
  VERSION_CHECK_DELAY_MS,
} from './useAppUpdateNotice';

vi.mock('sonner', () => ({ toast: vi.fn() }));

type FakeRegistration = {
  update: ReturnType<typeof vi.fn>;
  waiting: { postMessage: ReturnType<typeof vi.fn> } | null;
};

// A stand-in for navigator.serviceWorker: an event target with a controller
// and a registration whose update() we can watch.
function fakeServiceWorker(controller: object | null) {
  const target = new EventTarget() as EventTarget & {
    controller: object | null;
    getRegistration: () => Promise<FakeRegistration>;
  };
  const registration: FakeRegistration = { update: vi.fn().mockResolvedValue(undefined), waiting: null };
  target.controller = controller;
  target.getRegistration = vi.fn().mockResolvedValue(registration);
  return { sw: target, registration };
}

function Probe() {
  useAppUpdateNotice();
  return null;
}

// What the server's /version.json says. Builds are compared with the
// __BUILD_TIMESTAMP__ define, which vitest.config.ts sets to 'test-build'.
function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

// Lets the fetch -> json() -> compare promise chain finish.
async function settle() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

const NEW_VERSION_MESSAGE = 'A new version of GigWrangler is ready.';

describe('useAppUpdateNotice', () => {
  let original: PropertyDescriptor | undefined;
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalLocation = window.location;
  let reload: ReturnType<typeof vi.fn>;

  const install = (controller: object | null) => {
    const fake = fakeServiceWorker(controller);
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: fake.sw });
    return fake;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    // By default the server runs the same build as this page.
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({ build: __BUILD_TIMESTAMP__ }));
    vi.stubGlobal('fetch', fetchMock);
    reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    if (original) Object.defineProperty(navigator, 'serviceWorker', original);
    else delete (navigator as any).serviceWorker;
  });

  it('shows a Reload banner when a new version takes over the open app', () => {
    const { sw } = install({});
    render(<Probe />);
    expect(toast).not.toHaveBeenCalled();

    act(() => { sw.dispatchEvent(new Event('controllerchange')); });

    expect(toast).toHaveBeenCalledWith(
      NEW_VERSION_MESSAGE,
      expect.objectContaining({
        id: 'app-update',
        duration: Infinity,
        action: expect.objectContaining({ label: 'Reload' }),
      }),
    );
  });

  it('stays quiet on the very first install (nothing older was running)', () => {
    const { sw } = install(null);
    render(<Probe />);
    act(() => { sw.dispatchEvent(new Event('controllerchange')); });
    expect(toast).not.toHaveBeenCalled();
  });

  it('checks for a new version when the app comes back to the foreground and every 30 minutes', async () => {
    const { registration } = install({});
    render(<Probe />);
    registration.update.mockClear();

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(registration.update).toHaveBeenCalledTimes(1);

    await act(async () => { vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS); });
    expect(registration.update).toHaveBeenCalledTimes(2);
    expect(UPDATE_CHECK_INTERVAL_MS).toBe(30 * 60 * 1000);
  });

  describe('version check (for phones where controllerchange never fires)', () => {
    it('shows the Reload banner and asks the service worker to update when the server has a different build', async () => {
      const { registration } = install({});
      fetchMock.mockResolvedValue(jsonResponse({ build: 'a-newer-build' }));
      render(<Probe />);
      registration.update.mockClear();

      await act(async () => { vi.advanceTimersByTime(VERSION_CHECK_DELAY_MS); });
      await settle();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledWith(
        NEW_VERSION_MESSAGE,
        expect.objectContaining({
          id: 'app-update',
          duration: Infinity,
          action: expect.objectContaining({ label: 'Reload' }),
        }),
      );
      expect(registration.update).toHaveBeenCalled();
    });

    it('stays quiet when the server has the same build', async () => {
      install({});
      render(<Probe />);

      await act(async () => { vi.advanceTimersByTime(VERSION_CHECK_DELAY_MS); });
      await settle();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(toast).not.toHaveBeenCalled();
    });

    it('stays quiet when the check fails (offline), returns an error, or is not JSON (dev server)', async () => {
      install({});
      fetchMock
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(jsonResponse({ build: 'a-newer-build' }, 404))
        .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <')) })
        .mockResolvedValueOnce(jsonResponse({ nope: true }));
      render(<Probe />);

      await act(async () => { vi.advanceTimersByTime(VERSION_CHECK_DELAY_MS); });
      await settle();
      for (let i = 0; i < 3; i++) {
        await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
        await settle();
      }

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(toast).not.toHaveBeenCalled();
    });

    it('fetches /version.json uncached when the app comes back to the foreground and every 30 minutes', async () => {
      install({});
      render(<Probe />);
      await act(async () => { vi.advanceTimersByTime(VERSION_CHECK_DELAY_MS); });
      await settle();
      fetchMock.mockClear();

      await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
      await settle();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toMatch(/^\/version\.json\?/);
      expect(init).toEqual(expect.objectContaining({ cache: 'no-store' }));

      await act(async () => { vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS); });
      await settle();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      // Each check busts any cache in between with a fresh query string.
      expect(fetchMock.mock.calls[1][0]).not.toBe(url);
    });

    it('Reload tells a waiting service worker to take over, then reloads', async () => {
      const { registration } = install({});
      const waiting = { postMessage: vi.fn() };
      registration.waiting = waiting;
      fetchMock.mockResolvedValue(jsonResponse({ build: 'a-newer-build' }));
      render(<Probe />);
      await act(async () => { vi.advanceTimersByTime(VERSION_CHECK_DELAY_MS); });
      await settle();

      const options = vi.mocked(toast).mock.calls[0][1] as { action: { onClick: () => void } };
      await act(async () => { options.action.onClick(); });
      await settle();

      expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(reload).toHaveBeenCalledTimes(1);
    });
  });
});
