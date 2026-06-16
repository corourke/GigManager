import { useState, useMemo } from 'react';
import { FileText, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Button } from '../../ui/button';
import { isReconciled, sumLineCosts } from './reconciliation';
import type { DbPurchase } from '../../../utils/supabase/types';

interface PurchaseGroup {
  header: DbPurchase;
  children: DbPurchase[];
}

interface PurchaseSummaryViewProps {
  groups: PurchaseGroup[];
  headerAttachments: Map<string, { filePath: string; fileName: string }>;
  gigNames: Map<string, string>;
  onSelectGroup: (headerId: string) => void;
  onViewDoc: (headerId: string) => void;
}

type SortField = 'date' | 'vendor' | 'total';
type SortDir = 'asc' | 'desc';

export default function PurchaseSummaryView({
  groups,
  headerAttachments,
  gigNames,
  onSelectGroup,
  onViewDoc,
}: PurchaseSummaryViewProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedGroups = useMemo(() => {
    const sorted = [...groups];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = (a.header.purchase_date || '').localeCompare(b.header.purchase_date || '');
          break;
        case 'vendor':
          cmp = (a.header.vendor || '').localeCompare(b.header.vendor || '');
          break;
        case 'total':
          cmp = (a.header.total_inv_amount || 0) - (b.header.total_inv_amount || 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [groups, sortField, sortDir]);

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-1 -ml-1 text-[10px] uppercase font-bold hover:bg-gray-100"
      onClick={() => toggleSort(field)}
    >
      {children}
      <ArrowUpDown className={`w-3 h-3 ml-1 ${sortField === field ? 'text-sky-600' : 'text-gray-300'}`} />
    </Button>
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow className="h-8 hover:bg-transparent">
            <TableHead className="py-1 px-3">
              <SortableHeader field="date">Date</SortableHeader>
            </TableHead>
            <TableHead className="py-1 px-3">
              <SortableHeader field="vendor">Vendor</SortableHeader>
            </TableHead>
            <TableHead className="text-[10px] uppercase font-bold py-1 px-3">Description</TableHead>
            <TableHead className="text-[10px] uppercase font-bold py-1 px-3 text-center">Items</TableHead>
            <TableHead className="text-[10px] uppercase font-bold py-1 px-3 text-right">Line Total</TableHead>
            <TableHead className="py-1 px-3 text-right">
              <SortableHeader field="total">Inv Total</SortableHeader>
            </TableHead>
            <TableHead className="text-[10px] uppercase font-bold py-1 px-3 text-center w-10"></TableHead>
            <TableHead className="text-[10px] uppercase font-bold py-1 px-3 text-center w-10">Doc</TableHead>
            <TableHead className="text-[10px] uppercase font-bold py-1 px-3">Gig</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedGroups.map((group) => {
            const lineTotal = sumLineCosts(group.children);
            const reconciled = isReconciled(group.header.total_inv_amount, group.children);
            const hasDoc = headerAttachments.has(group.header.id);
            const gigName = group.header.gig_id ? gigNames.get(group.header.gig_id) : null;

            return (
              <TableRow
                key={group.header.id}
                className="h-9 hover:bg-sky-50 transition-colors cursor-pointer"
                onClick={() => onSelectGroup(group.header.id)}
              >
                <TableCell className="py-1 px-3 text-xs text-gray-700 whitespace-nowrap">
                  {group.header.purchase_date || '—'}
                </TableCell>
                <TableCell className="py-1 px-3 text-xs font-semibold text-sky-700">
                  {group.header.vendor || '—'}
                </TableCell>
                <TableCell className="py-1 px-3 text-xs text-gray-600 truncate max-w-[200px]">
                  {group.header.description || '—'}
                </TableCell>
                <TableCell className="py-1 px-3 text-xs text-center font-mono">
                  {group.children.length}
                </TableCell>
                <TableCell className="py-1 px-3 text-xs text-right font-mono">
                  ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="py-1 px-3 text-xs text-right font-mono font-bold">
                  ${(group.header.total_inv_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="py-1 px-3 text-center">
                  {!reconciled && (
                    <span title="Line items don't match invoice total">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline" />
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-1 px-3 text-center">
                  {hasDoc && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded p-0.5 hover:bg-sky-100"
                      title={`View ${headerAttachments.get(group.header.id)?.fileName || 'document'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDoc(group.header.id);
                      }}
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-500" />
                    </button>
                  )}
                </TableCell>
                <TableCell className="py-1 px-3">
                  {gigName && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-purple-600 border-purple-200">
                      {gigName}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
