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

function readHidden(table: string): string[] | null {
  try {
    const raw = localStorage.getItem(storageKey(table));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : null;
  } catch {
    return null;
  }
}

function writeHidden(table: string, hidden: string[]) {
  try {
    localStorage.setItem(storageKey(table), JSON.stringify(hidden));
  } catch {
    // Storage unavailable (private window etc.): the choice lasts for this page only.
  }
}

/**
 * Which columns of a gig-page table the viewer has chosen to show (#12).
 * Remembered per table in this browser; required columns can't be hidden.
 */
export function useColumnVisibility(table: string, columns: readonly ColumnDef[]) {
  const [hidden, setHidden] = useState<string[]>(
    () => readHidden(table) ?? columns.filter((c) => c.defaultHidden).map((c) => c.key),
  );

  const isVisible = useCallback(
    (key: string) => !!columns.find((c) => c.key === key)?.required || !hidden.includes(key),
    [columns, hidden],
  );

  const toggle = useCallback(
    (key: string) => {
      if (columns.find((c) => c.key === key)?.required) return;
      setHidden((prev) => {
        const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
        writeHidden(table, next);
        return next;
      });
    },
    [columns, table],
  );

  const visible = useMemo(() => columns.map((c) => c.key).filter(isVisible), [columns, isVisible]);

  return { visible, isVisible, toggle };
}
