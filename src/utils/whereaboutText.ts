// How an item's places read (#186): the Locations "where is it" card and the Item page's
// "Where they are". Step 4: pieces in maintenance read at their maintenance location, and
// pieces out at a gig say how many of them are flagged to go when they come home.

export interface PlaceText {
  gig_id: string | null;
  gig_title?: string | null;
  location: string | null;
  quantity: number;
  maintenance?: 'in' | 'flagged';
  flagged?: number;
}

const flaggedNote = (p: PlaceText) => (p.maintenance === 'flagged' ? `${p.flagged ?? p.quantity} flagged to maintenance` : null);

/** The card: "4 at Harvest Gala (Stage), 2 flagged to maintenance · 1 in maintenance · Repair Bench · 2 not checked out". */
export function whereCardText(places: readonly PlaceText[]): string {
  return places.map((p) => {
    if (p.maintenance === 'in') return `${p.quantity} in maintenance${p.location ? ` · ${p.location}` : ''}`;
    const at = p.gig_id
      ? `${p.quantity} at ${p.gig_title ?? 'a gig'}${p.location ? ` (${p.location})` : ''}`
      : p.location ? `${p.quantity} at ${p.location}` : `${p.quantity} not checked out`;
    const flag = flaggedNote(p);
    return flag ? `${at}, ${flag}` : at;
  }).join(' · ');
}

/** The Item page, one line a place: "4 · Harvest Gala (Stage) · 2 flagged to maintenance". */
export function whereTheyAreLines(places: readonly PlaceText[]): string[] {
  return places.map((p) => {
    if (p.maintenance === 'in') return `${p.quantity} · In maintenance${p.location ? ` · ${p.location}` : ''}`;
    const place = p.gig_id ? `${p.gig_title ?? 'A gig'}${p.location ? ` (${p.location})` : ''}` : p.location ?? 'Not checked out';
    return [`${p.quantity}`, place, flaggedNote(p)].filter(Boolean).join(' · ');
  });
}
