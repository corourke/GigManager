// Helpers for the serial/tag rows of a unit entry (#183): number tags in sequence,
// paste a column of serials, and suggest items close to a typed model.
import type { UnitRow } from './lineUnits';

/** n tags counting on from `start`: its trailing number goes up, keeping its padding. */
export function numberTags(start: string, n: number): string[] {
  const s = start.trim();
  const m = s.match(/^(.*?)(\d+)$/);
  const prefix = m ? m[1] : s;
  const first = m ? parseInt(m[2], 10) : 1;
  const width = m ? m[2].length : 0;
  return Array.from({ length: n }, (_, i) => `${prefix}${String(first + i).padStart(width, '0')}`);
}

/** Every unit's tag, in sequence from `start`; serials stay. */
export function fillTags(rows: readonly UnitRow[], start: string): UnitRow[] {
  const tags = numberTags(start, rows.length);
  return rows.map((r, i) => ({ ...r, tag_number: tags[i] }));
}

/** Values pasted as a column (one per line), or separated by ";", "," or tabs. */
export function splitPasted(text: string): string[] {
  return text.split(/[\r\n;,\t]+/).map((s) => s.trim()).filter(Boolean);
}

/** Pasted serials into the units in order; tags stay, extra serials are ignored. */
export function fillSerials(rows: readonly UnitRow[], text: string): UnitRow[] {
  const serials = splitPasted(text);
  return rows.map((r, i) => (i < serials.length ? { ...r, serial_number: serials[i] } : { ...r }));
}

const STOP = new Set(['the', 'and', 'with', 'for', 'of', 'a', 'an']);
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP.has(w));

/**
 * Items close to a typed model, so a near-duplicate can be picked instead (#183):
 * those sharing the most words with it, the same category first, at most three.
 */
export function suggestItems<T extends { manufacturer_model: string; category: string }>(
  items: readonly T[], model: string, category?: string, limit = 3,
): T[] {
  const typed = new Set(words(model));
  if (!typed.size) return [];
  const cat = category?.trim().toLowerCase();
  return items
    .map((item, order) => ({ item, order, score: words(item.manufacturer_model).filter((w) => typed.has(w)).length,
      same: !!cat && item.category.trim().toLowerCase() === cat }))
    .filter((s) => s.score > 0)
    .sort((a, b) => Number(b.same) - Number(a.same) || b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((s) => s.item);
}
