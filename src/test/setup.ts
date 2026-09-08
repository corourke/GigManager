import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// jsdom doesn't implement scrollIntoView; cmdk (Command/CommandList, used by
// TagsInput's suggestions popover among others) calls it when an item is
// highlighted, which otherwise throws and can crash the render tree mid-test.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// jsdom does not reliably back Web Storage, and Node >=22 ships an experimental
// `localStorage` / `sessionStorage` global whose getter returns `undefined` (and
// prints an ExperimentalWarning) unless `--localstorage-file` is passed — and
// that global shadows the one jsdom would otherwise install. The net effect on
// newer Node is `typeof localStorage === 'undefined'` inside tests. Install a
// deterministic in-memory implementation so tests that exercise persisted state
// (selected org, list filters, table state) behave identically on every Node /
// jsdom version.
function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key: string, value: string) => { store[String(key)] = String(value); },
    removeItem: (key: string) => { delete store[String(key)]; },
    clear: () => { store = {}; },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  } as Storage;
}

for (const prop of ['localStorage', 'sessionStorage'] as const) {
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, prop, { value: storage, configurable: true, writable: false });
  if (typeof window !== 'undefined' && window !== globalThis) {
    Object.defineProperty(window, prop, { value: storage, configurable: true, writable: false });
  }
}

// Reset persisted web storage between tests so filter/table state written by
// one test (e.g. useGigListFilters) can't leak into the next.
afterEach(() => {
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
});

// Mock Supabase client

// Mock the createClient function
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  })),
}))

// Mock the info file
vi.mock('../utils/supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'test-key',
}))

// NotificationBell (rendered inside AppHeader, which nearly every screen
// renders) reaches into AuthContext, react-router, and react-query directly.
// Most screen tests render AppHeader without any of those providers, so
// default it to a no-op here — NotificationBell.test.tsx explicitly
// vi.unmock()s this to exercise the real component.
vi.mock('../components/NotificationBell', () => ({
  default: () => null,
}))

// Same reasoning as NotificationBell above.
vi.mock('../components/ModeratorQueueMenuItem', () => ({
  default: () => null,
}))
