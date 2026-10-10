import { useCallback, useMemo, useState } from 'react';

export interface ColumnDef {
  key: string;
  label: string;
  /** Always shown; not offered in the picker. */
  required?: boolean;
  /** Off until the viewer turns it on. */
  defaultHidden?: boolean;
}

const storageKey = (table: string) => `gw.columns.${table}`;

/** What the viewer chose: columns hidden, and default-hidden columns turned on. */
interface Saved {
  hidden: string[];
  shown: string[];
}

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : []);

function readSaved(table: string): Saved {
  try {
    const raw = localStorage.getItem(storageKey(table));
    if (!raw) return { hidden: [], shown: [] };
    const parsed = JSON.parse(raw);
    // Saved before a default-hidden column could be turned on: just the hidden ones.
    if (Array.isArray(parsed)) return { hidden: strings(parsed), shown: [] };
    return { hidden: strings(parsed?.hidden), shown: strings(parsed?.shown) };
  } catch {
    return { hidden: [], shown: [] };
  }
}

function writeSaved(table: string, saved: Saved) {
  try {
    localStorage.setItem(storageKey(table), JSON.stringify(saved));
  } catch {
    // Storage unavailable (private window etc.): the choice lasts for this page only.
  }
}

/**
 * Which columns of a gig-page table the viewer has chosen to show (#12).
 * Remembered per table in this browser; required columns can't be hidden.
 * A default-hidden column stays off until the viewer turns it on, also for a
 * viewer who chose columns before it was added.
 */
export function useColumnVisibility(table: string, columns: readonly ColumnDef[]) {
  const [saved, setSaved] = useState<Saved>(() => readSaved(table));

  const isVisible = useCallback(
    (key: string) => {
      const column = columns.find((c) => c.key === key);
      if (column?.required) return true;
      return column?.defaultHidden ? saved.shown.includes(key) : !saved.hidden.includes(key);
    },
    [columns, saved],
  );

  const toggle = useCallback(
    (key: string) => {
      const column = columns.find((c) => c.key === key);
      if (column?.required) return;
      const list: keyof Saved = column?.defaultHidden ? 'shown' : 'hidden';
      setSaved((prev) => {
        const keys = prev[list].includes(key) ? prev[list].filter((k) => k !== key) : [...prev[list], key];
        const next = { ...prev, [list]: keys };
        writeSaved(table, next);
        return next;
      });
    },
    [columns, table],
  );

  const visible = useMemo(() => columns.map((c) => c.key).filter(isVisible), [columns, isVisible]);

  return { visible, isVisible, toggle };
}
