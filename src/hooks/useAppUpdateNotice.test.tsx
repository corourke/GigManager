import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import { useAppUpdateNotice, UPDATE_CHECK_INTERVAL_MS } from './useAppUpdateNotice';

vi.mock('sonner', () => ({ toast: vi.fn() }));

// A stand-in for navigator.serviceWorker: an event target with a controller
// and a registration whose update() we can watch.
function fakeServiceWorker(controller: object | null) {
  const target = new EventTarget() as EventTarget & {
    controller: object | null;
    getRegistration: () => Promise<{ update: () => Promise<void> }>;
  };
  const registration = { update: vi.fn().mockResolvedValue(undefined) };
  target.controller = controller;
  target.getRegistration = vi.fn().mockResolvedValue(registration);
  return { sw: target, registration };
}

function Probe() {
  useAppUpdateNotice();
  return null;
}

describe('useAppUpdateNotice', () => {
  let original: PropertyDescriptor | undefined;

  const install = (controller: object | null) => {
    const fake = fakeServiceWorker(controller);
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: fake.sw });
    return fake;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  });

  afterEach(() => {
    vi.useRealTimers();
    if (original) Object.defineProperty(navigator, 'serviceWorker', original);
    else delete (navigator as any).serviceWorker;
  });

  it('shows a Reload banner when a new version takes over the open app', () => {
    const { sw } = install({});
    render(<Probe />);
    expect(toast).not.toHaveBeenCalled();

    act(() => { sw.dispatchEvent(new Event('controllerchange')); });

    expect(toast).toHaveBeenCalledWith(
      'A new version of GigWrangler is ready.',
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
});
