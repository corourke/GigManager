import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { SaveState } from './useAutoSave';

export interface EditSessionValue {
  report: (id: string, state: SaveState, flush: () => Promise<void>) => void;
  remove: (id: string) => void;
}

export const EditSessionContext = createContext<EditSessionValue | null>(null);

/** The single save state shown in the gig page header (#12): error > saving > saved > idle. */
export function combineSaveStates(states: SaveState[]): SaveState {
  if (states.includes('error')) return 'error';
  if (states.includes('saving')) return 'saving';
  if (states.includes('saved')) return 'saved';
  return 'idle';
}

/**
 * Collects the save state of every autosaving section inside it, so the gig
 * page can show one indicator and have Done wait for pending saves (#12).
 */
export function useEditSession() {
  const entries = useRef(new Map<string, { state: SaveState; flush: () => Promise<void> }>());
  const [state, setState] = useState<SaveState>('idle');

  const recompute = useCallback(() => {
    setState(combineSaveStates([...entries.current.values()].map((e) => e.state)));
  }, []);

  const value = useMemo<EditSessionValue>(() => ({
    report: (id, s, flush) => { entries.current.set(id, { state: s, flush }); recompute(); },
    remove: (id) => { entries.current.delete(id); recompute(); },
  }), [recompute]);

  /** Saves everything still pending; resolves when all sections have finished. */
  const flushAll = useCallback(
    () => Promise.all([...entries.current.values()].map((e) => e.flush().catch(() => {}))).then(() => {}),
    [],
  );

  return { state, flushAll, value };
}

export type EditSession = ReturnType<typeof useEditSession>;

/** Called by useAutoSave (and the schedule editor): no-op outside an edit session. */
export function useReportToEditSession(state: SaveState, flush: () => Promise<void>) {
  const session = useContext(EditSessionContext);
  const id = useId();
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    session?.report(id, state, () => flushRef.current());
  }, [session, id, state]);

  useEffect(() => () => session?.remove(id), [session, id]);
}
