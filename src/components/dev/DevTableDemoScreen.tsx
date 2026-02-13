// Access by pasting this into your browser console: 
// localStorage.setItem('currentRoute', 'dev-demo'); location.reload();

import React, { useState } from 'react';
import { SmartDataTable, ColumnDef, RowAction } from '../tables/SmartDataTable';
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
  delivery_date: string;
  start_time: string;
}

const MOCK_DATA: DemoData[] = [
  { id: '1', name: 'MacBook Pro', category: 'Computing', status: 'Booked', quantity: 5, price: 2500, is_active: true, notes: 'New delivery', delivery_date: '2024-02-15T12:00:00.000Z', start_time: '2024-02-15T20:00:00.000Z' },
  { id: '2', name: 'iPhone 15', category: 'Mobile', status: 'Proposed', quantity: 10, price: 999, is_active: true, notes: 'Restock', delivery_date: '2024-02-16T12:00:00.000Z', start_time: '2024-02-16T12:00:00.000Z' },
  { id: '3', name: 'Sony A7IV', category: 'Camera', status: 'Completed', quantity: 2, price: 2499, is_active: false, notes: 'In service', delivery_date: '2024-02-14T12:00:00.000Z', start_time: '2024-03-01T15:30:00.000Z' },
  { id: '4', name: 'Shure SM7B', category: 'Audio', status: 'DateHold', quantity: 8, price: 399, is_active: true, notes: 'Standard mic', delivery_date: '2024-02-17T12:00:00.000Z', start_time: '2024-02-17T12:00:00.000Z' },
  { id: '5', name: 'Dell Monitor', category: 'Computing', status: 'Booked', quantity: 15, price: 450, is_active: true, notes: 'Dual setup', delivery_date: '2024-02-18T12:00:00.000Z', start_time: '2024-02-18T23:00:00.000Z' },
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
      editable: true,
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
      className: 'w-[200px]',
    },
    {
      id: 'delivery_date',
      header: 'Delivery',
      accessor: 'delivery_date',
      editable: true,
      type: 'date',
      className: 'w-[150px]',
    },
    {
      id: 'start_time',
      header: 'Start',
      accessor: 'start_time',
      sortable: true,
      editable: true,
      type: 'datetime',
      timezone: 'America/Los_Angeles',
      className: 'w-[200px]',
    },
  ];

  const handleUpdate = async (id: string, updates: Partial<DemoData>) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    toast.success(`Updated ${Object.keys(updates).join(', ')}`);
  };

  const rowActions: RowAction<DemoData>[] = [
    {
      id: 'view',
      onClick: (row) => toast.info(`Viewing ${row.name}`),
    },
    {
      id: 'edit',
      onClick: (row) => toast.info(`Editing ${row.name}`),
    },
    {
      id: 'duplicate',
      onClick: (row) => toast.info(`Duplicating ${row.name}`),
    },
    {
      id: 'delete',
      onClick: (row) => {
        setData(prev => prev.filter(item => item.id !== row.id));
        toast.error(`Deleted ${row.name}`);
      },
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">SmartDataTable Demo</h1>
        <p className="text-muted-foreground mt-2">
          Testing all table capabilities: Sorting, Filtering, Column Visibility, In-place Editing, and Row Actions.
        </p>
      </div>

      <SmartDataTable
        tableId="demo-table"
        data={data}
        columns={columns}
        onRowUpdate={handleUpdate}
        rowActions={rowActions}
      />

      <div className="bg-slate-50 p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Developer Instructions</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
          <li><strong>Selection:</strong> Click once to select a cell (blue outline).</li>
          <li><strong>Navigation:</strong> Use <code>TAB</code> (right), <code>Shift+TAB</code> (left), <code>ENTER</code> (down), or <code>Shift+ENTER</code> (up) to move selection.</li>
          <li><strong>Type to Edit:</strong> Start typing while a cell is selected to immediately enter edit mode. <code>SPACEBAR</code> toggles checkboxes.</li>
          <li><strong>Dates:</strong> Use the <strong>Delivery</strong> column to test date inputs.</li>
          <li><strong>Editing:</strong> Double-click a selected cell to enter edit mode. For checkboxes, a single click toggles immediately.</li>
          <li><strong>Text Shifting:</strong> Entering edit mode should not shift text. The cursor is placed at the end of the text.</li>
          <li><strong>Numbers & Currency:</strong> Both <strong>Qty</strong> and <strong>Price</strong> columns use numeric inputs for natural editing.</li>
          <li><strong>Persistence:</strong> Sorting, filters, and hidden columns are saved to LocalStorage per <code>tableId</code>.</li>
        </ul>
      </div>
    </div>
  );
}
