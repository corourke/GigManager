import { Component, lazy, Suspense, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChunkLoadBoundary } from './ChunkLoadBoundary';
import { isChunkLoadError } from './isChunkLoadError';
import { CHUNK_RELOAD_KEY } from './chunkRecovery';

class Outer extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <div>outer caught: {this.state.error.message}</div> : this.props.children;
  }
}

function renderLazy(importer: () => Promise<{ default: () => ReactNode }>) {
  const Lazy = lazy(importer);
  return render(
    <Outer>
      <ChunkLoadBoundary>
        <Suspense fallback={<div>loading</div>}>
          <Lazy />
        </Suspense>
      </ChunkLoadBoundary>
    </Outer>,
  );
}

describe('isChunkLoadError', () => {
  it.each([
    ['Failed to fetch dynamically imported module: https://x/assets/a.js'],
    ['Importing a module script failed.'],
    ['error loading dynamically imported module: https://x/assets/a.js'],
  ])('recognizes %s', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('recognizes a ChunkLoadError by name', () => {
    const err = new Error('Loading chunk 7 failed.');
    err.name = 'ChunkLoadError';
    expect(isChunkLoadError(err)).toBe(true);
  });

  it('rejects ordinary errors and non-errors', () => {
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

// jsdom reports React's caught render errors as uncaught window errors
const swallowWindowError = (e: ErrorEvent) => e.preventDefault();

const chunkError = () =>
  Promise.reject(new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js'));

describe('ChunkLoadBoundary', () => {
  let reload: ReturnType<typeof vi.fn>;
  let cacheDelete: ReturnType<typeof vi.fn>;
  let unregister: ReturnType<typeof vi.fn>;
  const originalLocation = window.location;

  beforeEach(() => {
    reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    });
    cacheDelete = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['workbox-precache-v2', 'other-cache']),
      delete: cacheDelete,
    });
    unregister = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }, { unregister }]) },
    });
    window.addEventListener('error', swallowWindowError);
    // React logs caught render errors; keep test output readable
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.removeEventListener('error', swallowWindowError);
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    Reflect.deleteProperty(navigator, 'serviceWorker');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the lazy component when the chunk loads', async () => {
    renderLazy(() => Promise.resolve({ default: () => <div>loaded screen</div> }));
    expect(await screen.findByText('loaded screen')).toBeInTheDocument();
  });

  it('on the first chunk error, clears the service-worker caches, unregisters it and reloads', async () => {
    renderLazy(chunkError);
    expect(await screen.findByText('Updating the app…')).toBeInTheDocument();
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(cacheDelete.mock.calls).toEqual([['workbox-precache-v2'], ['other-cache']]);
    expect(unregister).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe('1');
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
  });

  it('after the automatic reload, shows the Reload prompt, whose button repairs and reloads', async () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1'); // the automatic reload already happened
    renderLazy(chunkError);
    expect(
      await screen.findByText(/This screen couldn't load\. Check your connection and reload\./),
    ).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    expect(cacheDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(cacheDelete).toHaveBeenCalledTimes(2);
    expect(unregister).toHaveBeenCalledTimes(2);
  });

  it('reloads automatically only once per session, so a lasting failure cannot loop', async () => {
    const first = renderLazy(chunkError);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    first.unmount();

    // The page came back (same tab, same sessionStorage) and the chunk still fails
    renderLazy(chunkError);
    expect(await screen.findByRole('button', { name: 'Reload' })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('still reloads when Cache Storage and service workers are unavailable', async () => {
    vi.stubGlobal('caches', undefined);
    Reflect.deleteProperty(navigator, 'serviceWorker');
    renderLazy(chunkError);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('still reloads when clearing caches or unregistering fails', async () => {
    vi.stubGlobal('caches', { keys: vi.fn().mockRejectedValue(new Error('SecurityError')) });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockRejectedValue(new Error('InvalidStateError')) },
    });
    renderLazy(chunkError);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('does not reload automatically when sessionStorage is unusable, since nothing could stop a loop', async () => {
    const getItem = vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderLazy(chunkError);
    expect(await screen.findByRole('button', { name: 'Reload' })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    expect(getItem).toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(cacheDelete).not.toHaveBeenCalled();
  });

  it('rethrows other errors to the next boundary', async () => {
    renderLazy(() => Promise.reject(new Error('boom')));
    expect(await screen.findByText('outer caught: boom')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    expect(cacheDelete).not.toHaveBeenCalled();
  });
});
