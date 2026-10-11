// The packing list's optional columns (#245): the gig page keeps the choice so its printout
// matches the screen.

export type PackingColumn = 'status' | 'scanned_at' | 'location' | 'scanned_by' | 'notes';

/** Every optional column, on by default. */
export const DEFAULT_PACKING_COLUMNS: ReadonlySet<PackingColumn> = new Set(['status', 'scanned_at', 'location', 'scanned_by', 'notes']);
