// #185 (Cameron, 10-09): which lots an "any" line of an untagged item is packed from, with no
// "which lot?" prompt. The lot with the most pieces at home first; if it can't cover the line,
// the rest from the next. Ties: the older lot (created_at), then the lower id. Each pick is one
// tracking row in the line's (gig, kit) bucket.

export interface LotAtHome {
  id: string;
  /** Pieces of this lot at home now (placementOf's home quantity). */
  at_home: number;
  created_at?: string | null;
}

export function pickLots(lots: readonly LotAtHome[], needed: number): {
  picks: { asset_id: string; quantity: number }[];
  /** How many of `needed` no lot could cover. */
  short: number;
} {
  const order = [...lots]
    .filter((l) => l.at_home > 0)
    .sort((a, b) => b.at_home - a.at_home
      || String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
      || a.id.localeCompare(b.id));
  const picks: { asset_id: string; quantity: number }[] = [];
  let left = Math.max(0, Math.floor(needed));
  for (const l of order) {
    if (left === 0) break;
    const take = Math.min(l.at_home, left);
    picks.push({ asset_id: l.id, quantity: take });
    left -= take;
  }
  return { picks, short: left };
}
