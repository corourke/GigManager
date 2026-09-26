import { useEffect, useState } from 'react';
import { getGigKits } from '../../../services/gig.service';
import ColumnsPicker from './ColumnsPicker';
import GigSection from './GigSection';
import { useColumnVisibility, type ColumnDef } from './useColumnVisibility';

interface KitRow {
  id: string;
  notes?: string | null;
  kit?: { name?: string; tag_number?: string | null; category?: string | null; rental_value?: number | string | null } | null;
}

interface GigEquipmentTableProps {
  gigId: string;
  organizationId: string;
  /** Rental values are Admin/Manager only (#12). */
  showAmounts: boolean;
}

/** Read-only list of the organization's kits assigned to this gig (#12). */
export default function GigEquipmentTable({ gigId, organizationId, showAmounts }: GigEquipmentTableProps) {
  const [rows, setRows] = useState<KitRow[] | null>(null);
  const columns: ColumnDef[] = [
    { key: 'name', label: 'Kit', required: true },
    { key: 'tag', label: 'Tag #' },
    { key: 'category', label: 'Category' },
    ...(showAmounts ? [{ key: 'value', label: 'Rental value' }] : []),
    { key: 'notes', label: 'Notes' },
  ];
  const cols = useColumnVisibility('gig.equipment', columns);

  useEffect(() => {
    let cancelled = false;
    getGigKits(gigId, organizationId)
      .then((data: KitRow[]) => { if (!cancelled) setRows(data); })
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
                <td className="py-1.5 pr-3 font-semibold">{r.kit?.name}</td>
                {cols.isVisible('tag') && <td className="py-1.5 pr-3">{r.kit?.tag_number}</td>}
                {cols.isVisible('category') && <td className="py-1.5 pr-3 text-muted-foreground">{r.kit?.category}</td>}
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
