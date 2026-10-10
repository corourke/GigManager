import { useEffect, useState } from 'react';
import { getGigKits } from '../../../services/gig.service';
import { getKitsFlattenedSummary } from '../../../services/kit.service';
import { getPackingListReport } from '../../../services/inventoryManagement.service';
import { kitLocationSummary, kitStatusSummary, summarizeKitPacking, type CellSummary, type KitPackingSummary } from '../../../utils/packingSummary';
import ColumnsPicker from './ColumnsPicker';
import GigSection from './GigSection';
import { useColumnVisibility, type ColumnDef } from './useColumnVisibility';

interface KitRow {
  id: string;
  kit_id?: string;
  notes?: string | null;
  /** Added on the phone at pack-out (#185). */
  added_at_pack_out?: boolean;
  kit?: { id?: string; name?: string; tag_number?: string | null; category?: string | null; rental_value?: number | string | null } | null;
}

interface GigEquipmentTableProps {
  gigId: string;
  organizationId: string;
  /** Rental values are Admin/Manager only (#12). */
  showAmounts: boolean;
}

/** A summary cell: its breakdown on hover. */
function SummaryCell({ summary, loading }: { summary: CellSummary; loading: boolean }) {
  return (
    <td className="py-1.5 pr-3 tabular-nums">
      {loading ? (
        <span className="text-muted-foreground">…</span>
      ) : (
        <span title={summary.title || undefined} className={summary.muted ? 'text-muted-foreground' : undefined}>{summary.text}</span>
      )}
    </td>
  );
}

/** Read-only list of the organization's kits assigned to this gig (#12). */
export default function GigEquipmentTable({ gigId, organizationId, showAmounts }: GigEquipmentTableProps) {
  const [rows, setRows] = useState<KitRow[] | null>(null);
  const [holds, setHolds] = useState<Map<string, number>>(new Map());
  const columns: ColumnDef[] = [
    { key: 'name', label: 'Kit', required: true },
    { key: 'tag', label: 'Tag #' },
    { key: 'category', label: 'Category' },
    { key: 'holds', label: 'Holds' },
    // Where each kit's pieces are at this gig, from the packing list (Cameron, 10-09).
    { key: 'status', label: 'Status', defaultHidden: true },
    { key: 'location', label: 'Location', defaultHidden: true },
    ...(showAmounts ? [{ key: 'value', label: 'Rental value' }] : []),
    { key: 'notes', label: 'Notes' },
  ];
  const cols = useColumnVisibility('gig.equipment', columns);

  // Status and Location count what the packing list counts, from the same report; read only
  // once one of them is shown, and once per gig.
  const wantPacking = cols.isVisible('status') || cols.isVisible('location');
  const packingKey = `${organizationId}:${gigId}`;
  const [packing, setPacking] = useState<{ key: string; kits: Map<string, KitPackingSummary> } | null>(null);
  const packingLoaded = packing?.key === packingKey;
  useEffect(() => {
    if (!wantPacking || packingLoaded) return;
    let cancelled = false;
    getPackingListReport(organizationId, gigId)
      .then((data) => { if (!cancelled) setPacking({ key: packingKey, kits: summarizeKitPacking(data) }); })
      .catch(() => { if (!cancelled) setPacking({ key: packingKey, kits: new Map() }); });
    return () => { cancelled = true; };
  }, [wantPacking, packingLoaded, packingKey, organizationId, gigId]);
  const kitPacking = (r: KitRow) => (packing?.key === packingKey ? packing.kits.get(r.kit_id ?? r.kit?.id ?? '') : undefined);

  useEffect(() => {
    let cancelled = false;
    getGigKits(gigId, organizationId)
      .then((data: KitRow[]) => {
        if (cancelled) return;
        setRows(data);
        // How many pieces each kit holds, "any" lines included (#185).
        const kitIds = data.map((r) => r.kit_id ?? r.kit?.id).filter((id): id is string => !!id);
        getKitsFlattenedSummary(kitIds)
          .then((summary) => { if (!cancelled) setHolds(new Map([...summary].map(([id, s]) => [id, s.totalItems]))); })
          .catch(() => {});
      })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [gigId, organizationId]);

  return (
    <GigSection title="Equipment" summary={rows ? `${rows.length} kit${rows.length === 1 ? '' : 's'}` : undefined} actions={<ColumnsPicker columns={columns} {...cols} />}>
      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No equipment assigned yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground border-b">
              {columns.filter((c) => cols.isVisible(c.key)).map((c) => (
                <th key={c.key} className={`py-1 pr-3 font-bold ${c.key === 'value' ? 'text-right' : ''}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 last:border-0">
                <td className="py-1.5 pr-3 font-semibold">
                  {r.kit?.name}
                  {r.added_at_pack_out && <span className="ml-2 rounded border border-amber-300 bg-amber-50 px-1.5 text-[11px] font-medium text-amber-800">Added at pack-out</span>}
                </td>
                {cols.isVisible('tag') && <td className="py-1.5 pr-3">{r.kit?.tag_number}</td>}
                {cols.isVisible('category') && <td className="py-1.5 pr-3 text-muted-foreground">{r.kit?.category}</td>}
                {cols.isVisible('holds') && (() => {
                  const n = holds.get(r.kit_id ?? r.kit?.id ?? '');
                  return <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{n != null ? `${n} piece${n === 1 ? '' : 's'}` : ''}</td>;
                })()}
                {cols.isVisible('status') && <SummaryCell summary={kitStatusSummary(kitPacking(r))} loading={!packingLoaded} />}
                {cols.isVisible('location') && <SummaryCell summary={kitLocationSummary(kitPacking(r))} loading={!packingLoaded} />}
                {showAmounts && cols.isVisible('value') && (
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {r.kit?.rental_value != null ? `$${Number(r.kit.rental_value).toFixed(2)}` : '-'}
                  </td>
                )}
                {cols.isVisible('notes') && <td className="py-1.5 text-muted-foreground">{r.notes}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </GigSection>
  );
}
