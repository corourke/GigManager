// The packing list's optional columns (#245). The choice is remembered per browser, for every
// packing list, until the user changes it (Cameron, 10-11); the gig page also passes it to the
// printout so it matches the screen.

export type PackingColumn = 'status' | 'scanned_at' | 'location' | 'scanned_by' | 'notes';

/** Every optional column, on by default. */
export const DEFAULT_PACKING_COLUMNS: ReadonlySet<PackingColumn> = new Set(['status', 'scanned_at', 'location', 'scanned_by', 'notes']);

export const PACKING_COLUMNS_KEY = 'gigwrangler.packingList.columns';

/** The remembered choice; the defaults when there's none, or it can't be read. */
export function loadPackingColumns(): Set<PackingColumn> {
  try {
    const saved = JSON.parse(localStorage.getItem(PACKING_COLUMNS_KEY) ?? 'null');
    if (Array.isArray(saved)) return new Set(saved.filter((c): c is PackingColumn => DEFAULT_PACKING_COLUMNS.has(c)));
  } catch {
    // Storage blocked or unreadable: the defaults.
  }
  return new Set(DEFAULT_PACKING_COLUMNS);
}

/** Remember the choice in this browser; a blocked store just doesn't remember it. */
export function savePackingColumns(columns: ReadonlySet<PackingColumn>) {
  try {
    localStorage.setItem(PACKING_COLUMNS_KEY, JSON.stringify([...columns]));
  } catch {
    // Not remembered; the choice still applies until the page closes.
  }
}
