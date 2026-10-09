import { Component, lazy, Suspense, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChunkLoadBoundary } from './ChunkLoadBoundary';
import { isChunkLoadError } from './isChunkLoadError';

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

describe('ChunkLoadBoundary', () => {
  let reload: ReturnType<typeof vi.fn>;
  const originalLocation = window.location;

  beforeEach(() => {
    reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    });
    window.addEventListener('error', swallowWindowError);
    // React logs caught render errors; keep test output readable
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.removeEventListener('error', swallowWindowError);
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
  });

  it('renders the lazy component when the chunk loads', async () => {
    renderLazy(() => Promise.resolve({ default: () => <div>loaded screen</div> }));
    expect(await screen.findByText('loaded screen')).toBeInTheDocument();
  });

  it('offers a Reload button when the chunk fails to load', async () => {
    renderLazy(() =>
      Promise.reject(new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js')),
    );
    expect(
      await screen.findByText(/This screen couldn't load\. Check your connection and reload\./),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('rethrows other errors to the next boundary', async () => {
    renderLazy(() => Promise.reject(new Error('boom')));
    expect(await screen.findByText('outer caught: boom')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
  });
});
