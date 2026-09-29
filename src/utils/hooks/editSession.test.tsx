import { describe, it, expect, vi } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import { useEffect } from 'react';
import { combineSaveStates, useEditSession, useReportToEditSession } from './editSession';
import { EditSessionProvider } from './EditSessionProvider';
import type { SaveState } from './useAutoSave';

describe('combineSaveStates', () => {
  it('prefers error, then saving, then saved', () => {
    expect(combineSaveStates([])).toBe('idle');
    expect(combineSaveStates(['idle', 'saved'])).toBe('saved');
    expect(combineSaveStates(['saved', 'saving'])).toBe('saving');
    expect(combineSaveStates(['saving', 'error', 'saved'])).toBe('error');
  });
});

describe('edit session (#12)', () => {
  it('combines the sections and flushes them all', async () => {
    const flushA = vi.fn().mockResolvedValue(undefined);
    const flushB = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useEditSession());

    function Section({ state, flush }: { state: SaveState; flush: () => Promise<void> }) {
      useReportToEditSession(state, flush);
      return null;
    }
    const view = render(
      <EditSessionProvider session={result.current}>
        <Section state="saved" flush={flushA} /><Section state="saving" flush={flushB} />
      </EditSessionProvider>,
    );
    expect(result.current.state).toBe('saving');

    await act(() => result.current.flushAll());
    expect(flushA).toHaveBeenCalled();
    expect(flushB).toHaveBeenCalled();

    view.unmount();
    expect(result.current.state).toBe('idle');
  });

  it('does nothing outside a session', () => {
    function Lone() { useReportToEditSession('saving', async () => {}); useEffect(() => {}, []); return null; }
    expect(() => render(<Lone />)).not.toThrow();
  });
});
