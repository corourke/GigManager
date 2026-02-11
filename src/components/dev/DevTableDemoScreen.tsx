import React, { useState } from 'react';
import { SmartDataTable, ColumnDef } from '../tables/SmartDataTable';
import { GIG_STATUS_CONFIG } from '../../utils/supabase/constants';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface DemoData {
  id: string;
  name: string;
  category: string;
  status: string;
  quantity: number;
  price: number;
  is_active: boolean;
  notes: string;
}

const MOCK_DATA: DemoData[] = [
  { id: '1', name: 'MacBook Pro', category: 'Computing', status: 'Booked', quantity: 5, price: 2500, is_active: true, notes: 'New delivery' },
  { id: '2', name: 'iPhone 15', category: 'Mobile', status: 'Proposed', quantity: 10, price: 999, is_active: true, notes: 'Restock' },
  { id: '3', name: 'Sony A7IV', category: 'Camera', status: 'Completed', quantity: 2, price: 2499, is_active: false, notes: 'In service' },
  { id: '4', name: 'Shure SM7B', category: 'Audio', status: 'DateHold', quantity: 8, price: 399, is_active: true, notes: 'Standard mic' },
  { id: '5', name: 'Dell Monitor', category: 'Computing', status: 'Booked', quantity: 15, price: 450, is_active: true, notes: 'Dual setup' },
];

export default function DevTableDemoScreen() {
  const [data, setData] = useState<DemoData[]>(MOCK_DATA);

  const columns: ColumnDef<DemoData>[] = [
    {
      id: 'name',
      header: 'Product Name',
      accessor: 'name',
      sortable: true,
      filterable: true,
      editable: true,
      required: true,
      type: 'text',
    },
    {
      id: 'category',
      header: 'Category',
      accessor: 'category',
      sortable: true,
      filterable: true,
      editable: true,
      type: 'select',
      options: [
        { label: 'Computing', value: 'Computing' },
        { label: 'Mobile', value: 'Mobile' },
        { label: 'Camera', value: 'Camera' },
        { label: 'Audio', value: 'Audio' },
      ],
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      filterable: true,
      editable: true,
      type: 'pill',
      pillConfig: GIG_STATUS_CONFIG,
    },
    {
      id: 'quantity',
      header: 'Qty',
      accessor: 'quantity',
      sortable: true,
      editable: true,
      type: 'number',
      className: 'w-[80px]',
    },
    {
      id: 'price',
      header: 'Price',
      accessor: 'price',
      sortable: true,
      type: 'currency',
    },
    {
      id: 'is_active',
      header: 'Active',
      accessor: 'is_active',
      editable: true,
      type: 'checkbox',
      className: 'w-[80px] text-center',
    },
    {
      id: 'notes',
      header: 'Notes',
      accessor: 'notes',
      editable: true,
      optional: true,
      type: 'text',
    },
  ];

  const handleUpdate = async (id: string, updates: Partial<DemoData>) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    toast.success(`Updated ${Object.keys(updates).join(', ')}`);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">SmartDataTable Demo</h1>
        <p className="text-muted-foreground mt-2">
          Testing all table capabilities: Sorting, Filtering, Column Visibility, and In-place Editing.
        </p>
      </div>

      <SmartDataTable
        tableId="demo-table"
        data={data}
        columns={columns}
        onRowUpdate={handleUpdate}
        actions={(row) => (
          <Button variant="ghost" size="sm" onClick={() => toast.info(`Action for ${row.name}`)}>
            Action
          </Button>
        )}
      />

      <div className="bg-slate-50 p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Developer Instructions</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
          <li><strong>Selection:</strong> Click once to select a cell (blue outline).</li>
          <li><strong>Editing:</strong> Double-click a selected cell to enter edit mode. For checkboxes, a single click toggles immediately.</li>
          <li><strong>Persistence:</strong> Sorting, filters, and hidden columns are saved to LocalStorage per <code>tableId</code>.</li>
          <li><strong>Natural Feel:</strong> No layout shifts or flickering when entering edit mode.</li>
          <li><strong>Sorting:</strong> Click headers to sort (Cycle: ASC &rarr; DESC &rarr; None).</li>
          <li><strong>Filtering:</strong> Use the filter icon in headers to filter by column content.</li>
        </ul>
      </div>
    </div>
  );
}
